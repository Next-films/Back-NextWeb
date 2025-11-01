import { Inject, Injectable } from '@nestjs/common';
import { KinopoiskItemName, KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { Genre } from '@/movies/domain/genre.entity';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { QueryRunner } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { DateUtil } from '@/common/utils/date.util';
import { MovieTypesEnum } from '@/common/types/types';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(Genre.name) private readonly genreEntity: typeof Genre,
    private readonly genreRepository: GenreRepository,
    private readonly dateUtil: DateUtil,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
  ) {}

  async getOrCreateGenreFromKinopoisk(
    genres: KinopoiskItemName[],
    queryRunner?: QueryRunner,
  ): Promise<Genre[]> {
    const names = [...new Set(genres.map(g => g.name.toLowerCase()))];

    const existingGenres = await this.genreRepository.getByNames(names, queryRunner);

    const existingNames = new Set(existingGenres.map(g => g.name.toLowerCase()));
    const newGenresData = names
      .filter(name => !existingNames.has(name))
      .map(name => this.genreEntity.create(name));

    const createdGenres =
      newGenresData && newGenresData.length > 0
        ? await Promise.all(newGenresData.map(g => this.genreRepository.save(g, queryRunner)))
        : [];

    return [...existingGenres, ...createdGenres];
  }

  async getOrCreateGenre(genres: string[], queryRunner?: QueryRunner): Promise<Genre[]> {
    const names = [...new Set(genres.map(g => g.toLowerCase()))];

    const existingGenres = await this.genreRepository.getByNames(names, queryRunner);

    const existingNames = new Set(existingGenres.map(g => g.name.toLowerCase()));
    const newGenresData = names
      .filter(name => !existingNames.has(name))
      .map(name => this.genreEntity.create(name));

    const createdGenres =
      newGenresData && newGenresData.length > 0
        ? await Promise.all(newGenresData.map(g => this.genreRepository.save(g, queryRunner)))
        : [];

    return [...existingGenres, ...createdGenres];
  }

  isValidMovieForProduction<T extends MovieEntity>(movie: T): boolean {
    const {
      title,
      originalTitle,
      description,
      country,
      alternativeTitles,
      releaseDate,
      trailerUrl,
      backgroundContentUrl,
      previewUrl,
      titleUrl,
      videoUrl,
      duration,
      genres,
    } = movie;

    if (
      !title ||
      !description ||
      !originalTitle ||
      !releaseDate ||
      !trailerUrl ||
      !videoUrl ||
      !previewUrl ||
      !backgroundContentUrl ||
      !titleUrl ||
      !duration ||
      duration === 0 ||
      !genres ||
      genres.length <= 0 ||
      !country ||
      country.length <= 0 ||
      !alternativeTitles
    )
      return false;

    return true;
  }

  async extractMovieMetadata(
    kpMovie: KinopoiskMovie | null,
    queryRunner?: QueryRunner,
  ): Promise<MovieKpMetadata> {
    if (!kpMovie) {
      return {
        name: null,
        originalName: null,
        alternativeName: null,
        genres: null,
        countries: null,
        description: null,
        releaseDate: null,
        posterUrl: null,
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
      logo,
      videos,
    } = kpMovie || {};

    let worldReleaseDate: string | null = null;

    if (premiere) {
      const { world } = premiere;
      worldReleaseDate = world || null;
    }

    const name = rawName || rawAlternativeName || enName || null;
    const originalName = enName || rawAlternativeName || null;
    const alternativeName = [rawName, rawAlternativeName, enName, year].filter(Boolean).join(' ');

    const genres = rawGenres
      ? await this.getOrCreateGenreFromKinopoisk(rawGenres, queryRunner)
      : null;

    const countryNames = countries?.map(c => c.name) || null;

    const posterUrl = poster?.url || null;
    const titleUrl = logo?.url || null;
    const trailerUrl = videos?.trailers?.find(t => t.site === 'youtube')?.url || null;

    return {
      name,
      originalName,
      alternativeName,
      genres,
      countries: countryNames,
      description: description || null,
      releaseDate: worldReleaseDate ? this.dateUtil.formatDateYyMmDd(worldReleaseDate) : null,
      posterUrl,
      trailerUrl,
      titleUrl,
    };
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

  async getVideoContentUrl(
    file: Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    if (!file) return null;

    const result = await this.rmqResultHandlerUtil.getRmqData(
      () => Promise.resolve(this.downloaderServiceAdapter.uploadFilm(movieId, file, movieType)),
      this.getVideoContentUrl.name,
    );

    if (result.appResult !== AppNotificationResultEnum.Success) return null;

    return result.data;
  }

  async getBackgroundContentUrl(
    file: string | Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    if (!file) return null;

    const result = await this.rmqResultHandlerUtil.getRmqData(
      () => this.downloaderServiceAdapter.downloadPreviewClip(movieId, file, movieType),
      this.getBackgroundContentUrl.name,
    );

    if (result.appResult !== AppNotificationResultEnum.Success) return null;

    return result.data;
  }

  async getPosterUrl(
    posterUrl: string | Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    if (!posterUrl) return null;

    const result = await this.rmqResultHandlerUtil.getRmqData(
      () => this.downloaderServiceAdapter.resizeAndSavePoster(movieId, posterUrl, movieType),
      this.getPosterUrl.name,
    );

    if (result.appResult !== AppNotificationResultEnum.Success) return null;

    return result.data;
  }

  async getLogoUrl(
    logo: string | Express.Multer.File | null,
    movieId: number,
    movieType: MovieTypesEnum,
  ): Promise<string | null> {
    if (!logo) return null;

    const result = await this.rmqResultHandlerUtil.getRmqData(
      () => this.downloaderServiceAdapter.resizeAndSaveLogo(movieId, logo, movieType),
      this.getLogoUrl.name,
    );

    if (result.appResult !== AppNotificationResultEnum.Success) return null;

    return result.data;
  }
}
