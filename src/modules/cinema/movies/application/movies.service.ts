import { Inject, Injectable } from '@nestjs/common';
import {
  KinopoiskItemName,
  KinopoiskMovie,
  KinopoiskShortImage,
  KinopoiskVideo,
  KinopoiskVideoTypes,
} from '@/external-api/kinopoisk/domain/types';
import { Genre } from '@/movies/domain/genre.entity';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { QueryRunner } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieAvailabilityStatus, MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { DateUtil } from '@/common/utils/date.util';
import { MovieTypesEnum } from '@/common/types/types';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';

const UNIVERSE_STUDIO_KEYWORDS = [
  {
    universe: 'DISNEY',
    studio: 'Disney',
    keywords: ['disney', 'дисней', 'walt disney'],
  },
  {
    universe: 'PIXAR',
    studio: 'Pixar',
    keywords: ['pixar', 'пиксар', 'pixar animation studios'],
  },
  {
    universe: 'MARVEL',
    studio: 'Marvel Studios',
    keywords: ['marvel', 'марвел', 'marvel studios', 'mcu'],
  },
  {
    universe: 'STAR WARS',
    studio: 'Lucasfilm',
    keywords: ['star wars', 'звездные войны', 'звёздные войны', 'lucasfilm'],
  },
  {
    universe: 'DC',
    studio: 'Warner Bros.',
    keywords: ['dc', 'дс', 'dc comics', 'warner bros', 'dceu'],
  },
] as const;

@Injectable()
export class MoviesService {
  constructor(
    @Inject(Genre.name) private readonly genreEntity: typeof Genre,
    private readonly genreRepository: GenreRepository,
    private readonly dateUtil: DateUtil,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
  ) {}

  // ─── Genre helpers ──────────────────────────────────────────────

  async getOrCreateGenreFromKinopoisk(
    genres: KinopoiskItemName[],
    queryRunner?: QueryRunner,
  ): Promise<Genre[]> {
    return this.getOrCreateGenre(
      genres.map(g => g.name),
      queryRunner,
    );
  }

  async getOrCreateGenre(genres: string[], queryRunner?: QueryRunner): Promise<Genre[]> {
    const names = [...new Set(genres.map(g => g.toLowerCase()))];

    const existingGenres = await this.genreRepository.getByNames(names, queryRunner);
    const existingNames = new Set(existingGenres.map(g => g.name.toLowerCase()));

    const newGenres = names.filter(name => !existingNames.has(name));

    const createdGenres =
      newGenres.length > 0
        ? await Promise.all(
            newGenres.map(name =>
              this.genreRepository.save(this.genreEntity.create(name), queryRunner),
            ),
          )
        : [];

    return [...existingGenres, ...createdGenres];
  }

  // ─── Movie validation ──────────────────────────────────────────

  /**
   * titleUrl/trailerUrl/originalTitle/alternativeTitles намеренно не входят в список:
   * эти данные улучшают карточку, но не должны блокировать публикацию уже скачанного
   * фильма. Для премьер без видео действует отдельная более строгая проверка ниже.
   */
  isValidMovieForProduction<T extends MovieEntity>(movie: T): boolean {
    const { title, description, country, releaseDate, previewUrl, videoUrl, duration, genres } =
      movie;

    return !!(
      title &&
      description &&
      releaseDate &&
      videoUrl &&
      previewUrl &&
      duration &&
      duration !== 0 &&
      genres &&
      genres.length > 0 &&
      country &&
      country.length > 0
    );
  }

  isFilmInProductionOrModerate<T extends MovieEntity>(movie: T | null): boolean {
    return (
      movie?.handleStatus === MovieHandleStatus.PRODUCTION ||
      movie?.handleStatus === MovieHandleStatus.MODERATE
    );
  }

  setHandleProductionStatus<T extends MovieEntity>(movie: T): void {
    const isValid = this.isValidMovieForProduction(movie);
    movie.showOrHiddeMovie(
      !isValid,
      isValid ? MovieHandleStatus.PRODUCTION : MovieHandleStatus.MODERATE,
    );
  }

  isPremiereWithoutVideo<T extends MovieEntity>(movie: T): boolean {
    return movie.availabilityStatus !== MovieAvailabilityStatus.AVAILABLE && !movie.videoUrl;
  }

  setHandleProductionStatusForPremiere<T extends MovieEntity>(movie: T): void {
    const isValid = this.isValidMovieForPremiereProduction(movie);
    movie.showOrHiddeMovie(
      !isValid,
      isValid ? MovieHandleStatus.PRODUCTION : MovieHandleStatus.MODERATE,
    );
  }

  private isValidMovieForPremiereProduction<T extends MovieEntity>(movie: T): boolean {
    const { title, description, country, releaseDate, trailerUrl, previewUrl } = movie;

    return !!(
      this.hasText(title) &&
      this.hasText(description) &&
      this.hasText(releaseDate) &&
      this.hasText(trailerUrl) &&
      this.hasText(previewUrl) &&
      country &&
      country.length > 0
    );
  }

  private hasText(value: string | null): boolean {
    return Boolean(value && value.trim());
  }

  // ─── Kinopoisk metadata extraction ─────────────────────────────

  async extractMovieMetadata(
    kpMovie: KinopoiskMovie | null,
    queryRunner?: QueryRunner,
  ): Promise<MovieKpMetadata> {
    if (!kpMovie) {
      return {
        name: null,
        originalName: null,
        alternativeName: null,
        universe: null,
        studio: null,
        genres: null,
        countries: null,
        description: null,
        releaseDate: null,
        posterUrl: null,
        backdropUrl: null,
        titleUrl: null,
        trailerUrl: null,
      };
    }

    const {
      name: rawName,
      enName,
      alternativeName: rawAlternativeName,
      year,
      countries,
      premiere,
      description,
      genres: rawGenres,
      poster,
      backdrop,
      logo,
      videos,
    } = kpMovie;

    const worldReleaseDate = premiere?.world || null;
    const name = rawName || rawAlternativeName || enName || null;
    const originalName = enName || rawAlternativeName || null;
    const alternativeName = [rawName, rawAlternativeName, enName, year].filter(Boolean).join(' ');
    const posterUrl = this.selectKinopoiskImageUrl(poster);
    const backdropUrl = this.selectKinopoiskImageUrl(backdrop);

    const genres = rawGenres
      ? await this.getOrCreateGenreFromKinopoisk(rawGenres, queryRunner)
      : null;

    const { universe, studio } = this.extractUniverseAndStudio(kpMovie);

    return {
      name,
      originalName,
      alternativeName,
      universe,
      studio,
      genres,
      countries: countries?.map(c => c.name) || null,
      description: description || null,
      releaseDate: worldReleaseDate ? this.dateUtil.formatDateYyMmDd(worldReleaseDate) : null,
      posterUrl,
      backdropUrl,
      backdropUrls: backdropUrl ? [backdropUrl] : [],
      trailerUrl: this.selectTrailerUrl(videos),
      titleUrl: logo?.url || null,
    };
  }

  private selectKinopoiskImageUrl(image?: KinopoiskShortImage | null): string | null {
    return image?.url?.trim() || image?.previewUrl?.trim() || null;
  }

  getKinopoiskTrailerUrl(kpMovie: KinopoiskMovie | null): string | null {
    return kpMovie ? this.selectTrailerUrl(kpMovie.videos) : null;
  }

  private selectTrailerUrl(videos?: KinopoiskVideoTypes): string | null {
    const trailers = (videos?.trailers || []).filter(
      trailer => trailer.url?.trim() && this.isYoutubeTrailerSource(trailer),
    );
    if (!trailers.length) return null;

    return (
      trailers
        .map((trailer, index) => ({
          url: trailer.url!.trim(),
          score: this.getTrailerScore(trailer, index),
        }))
        .sort((a, b) => b.score - a.score)[0]?.url || null
    );
  }

  private getTrailerScore(trailer: KinopoiskVideo, index: number): number {
    const text = `${trailer.name || ''} ${trailer.type || ''}`.toLowerCase();
    const isTrailer = text.includes('trailer') || text.includes('трейлер');
    const isTeaser = text.includes('teaser') || text.includes('тизер');

    return (isTrailer ? 1_000 : 0) + (isTeaser ? 500 : 0) + 100 - index;
  }

  private isYoutubeTrailerSource(trailer: KinopoiskVideo): boolean {
    const url = trailer.url?.toLowerCase() || '';
    const site = trailer.site?.toLowerCase() || '';

    return site.includes('youtube') || url.includes('youtube.com') || url.includes('youtu.be');
  }

  // ─── Universe & studio detection ───────────────────────────────

  private normalizeSearchText(value: string): string {
    return value.toLowerCase().replace(/ё/g, 'е');
  }

  extractUniverseAndStudio(kpMovie: KinopoiskMovie | null): {
    universe: string | null;
    studio: string | null;
  } {
    if (!kpMovie) return { universe: null, studio: null };

    const networks = kpMovie.networks?.items || [];
    const networkStudio =
      networks
        .map(item => item?.name?.trim())
        .find(Boolean)
        ?.toString() || null;

    const textParts = [
      kpMovie.name,
      kpMovie.enName,
      kpMovie.alternativeName,
      kpMovie.description,
      kpMovie.shortDescription,
      kpMovie.slogan,
      ...(kpMovie.lists || []),
      ...(kpMovie.names?.map(n => n.name).filter(Boolean) || []),
      ...networks.map(item => item?.name).filter(Boolean),
    ].filter(Boolean) as string[];

    const fullText = this.normalizeSearchText(textParts.join(' '));

    let universe: string | null = null;
    let studio: string | null = networkStudio;

    for (const item of UNIVERSE_STUDIO_KEYWORDS) {
      const matched = item.keywords.some(keyword =>
        fullText.includes(this.normalizeSearchText(String(keyword))),
      );
      if (!matched) continue;

      universe = item.universe;
      if (!studio) studio = item.studio;
      break;
    }

    if (!universe && studio) {
      const normalizedStudio = this.normalizeSearchText(studio);
      for (const item of UNIVERSE_STUDIO_KEYWORDS) {
        if (
          item.keywords.some(kw => normalizedStudio.includes(this.normalizeSearchText(String(kw))))
        ) {
          universe = item.universe;
          break;
        }
      }
    }

    if (universe && !studio) {
      studio = UNIVERSE_STUDIO_KEYWORDS.find(item => item.universe === universe)?.studio || null;
    }

    return { universe, studio };
  }

  // ─── Media upload helpers ───────────────────────────────────────

  private stringifyDownloaderError(errorField: unknown): string {
    if (errorField == null) return 'unknown';

    if (Array.isArray(errorField)) {
      return errorField
        .map(item => {
          if (
            item &&
            typeof item === 'object' &&
            'field' in item &&
            'message' in item &&
            typeof (item as { field?: unknown }).field === 'string' &&
            typeof (item as { message?: unknown }).message === 'string'
          ) {
            const typedItem = item as { field: string; message: string };

            return `${typedItem.field}: ${typedItem.message}`;
          }

          try {
            return JSON.stringify(item);
          } catch {
            return '[unserializable item]';
          }
        })
        .join('; ');
    }

    if (
      errorField &&
      typeof errorField === 'object' &&
      'field' in errorField &&
      'message' in errorField &&
      typeof (errorField as { field?: unknown }).field === 'string' &&
      typeof (errorField as { message?: unknown }).message === 'string'
    ) {
      const typedError = errorField as { field: string; message: string };

      return `${typedError.field}: ${typedError.message}`;
    }

    try {
      return JSON.stringify(errorField);
    } catch {
      return '[unserializable errorField]';
    }
  }

  private async callDownloaderOrNull<T>(
    input: string | Express.Multer.File | null,
    action: () => Promise<AppNotificationResult<T, any>>,
    scope: string,
  ): Promise<T | null> {
    if (!input) return null;

    const result = await this.rmqResultHandlerUtil.getRmqData(action, scope);

    if (typeof input !== 'string' && result.appResult === AppNotificationResultEnum.BadRequest) {
      const details = this.stringifyDownloaderError(
        (result as AppNotificationResult<T, unknown>).errorField,
      );
      throw new Error(`Downloader validation error (${scope}): ${details}`);
    }

    return result.appResult === AppNotificationResultEnum.Success ? result.data ?? null : null;
  }

  async getVideoContentUrl(
    file: Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    return this.callDownloaderOrNull(
      file,
      () => Promise.resolve(this.downloaderServiceAdapter.uploadFilm(movieId, file!, movieType)),
      this.getVideoContentUrl.name,
    );
  }

  async getBackgroundContentUrl(
    file: string | Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
    s3KeyPrefix?: string,
  ): Promise<string | null> {
    return this.callDownloaderOrNull(
      file,
      () =>
        this.downloaderServiceAdapter.downloadPreviewClip(movieId, file!, movieType, s3KeyPrefix),
      this.getBackgroundContentUrl.name,
    );
  }

  async getPosterUrl(
    posterUrl: string | Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    return this.callDownloaderOrNull(
      posterUrl,
      () => this.downloaderServiceAdapter.resizeAndSavePoster(movieId, posterUrl!, movieType),
      this.getPosterUrl.name,
    );
  }

  async getLogoUrl(
    logo: string | Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    return this.callDownloaderOrNull(
      logo,
      () => this.downloaderServiceAdapter.resizeAndSaveLogo(movieId, logo!, movieType),
      this.getLogoUrl.name,
    );
  }
}
