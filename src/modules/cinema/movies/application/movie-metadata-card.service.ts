import { Injectable } from '@nestjs/common';
import { MovieTypesEnum } from '@/common/types/types';
import { MoviesService } from '@/movies/application/movies.service';
import { MovieEntity } from '@/movies/domain/movie.entity';
import {
  MovieAvailabilityStatus,
  MovieCreateDto,
  MovieHandleStatus,
  MovieKpMetadata,
  MovieUpdateDto,
} from '@/movies/domain/types';

type UpcomingModerationSnapshot = Pick<
  MovieCreateDto,
  | 'name'
  | 'alternativeName'
  | 'country'
  | 'description'
  | 'releaseDate'
  | 'genres'
  | 'trailerUrl'
  | 'backgroundContentUrl'
  | 'previewUrl'
>;

@Injectable()
export class MovieMetadataCardService {
  constructor(private readonly moviesService: MoviesService) {}

  shouldPublishUpcomingCard(metadata: MovieKpMetadata): boolean {
    return (
      this.isForeignCountryList(metadata.countries) && this.hasRequiredUpcomingMetadata(metadata)
    );
  }

  shouldCreateUpcomingCard(metadata: MovieKpMetadata): boolean {
    return this.isForeignCountryList(metadata.countries);
  }

  createMovieDto(metadata: MovieKpMetadata, kpId: string): MovieCreateDto {
    return {
      key: null,
      kpId,
      duration: 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      universe: metadata.universe,
      studio: metadata.studio,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      trailerUrl: metadata.trailerUrl,
      backgroundContentUrl: null,
      horizontalPreviewUrl: null,
      previewUrl: null,
      titleUrl: null,
      hidden: true,
      handleStatus: MovieHandleStatus.MODERATE,
    };
  }

  updateExistingMovie<T extends MovieEntity>(movie: T, metadata: MovieKpMetadata, kpId: string): T {
    const updateDto = this.createUpdateDto(movie, metadata, kpId);

    movie.update(updateDto);
    movie.showOrHiddeMovie(true, MovieHandleStatus.MODERATE);
    movie.updateAvailabilityStatus(MovieAvailabilityStatus.UPCOMING);
    return movie;
  }

  async hydrateNewMovieAssets<T extends MovieEntity>(
    movie: T,
    metadata: MovieKpMetadata,
    movieType: MovieTypesEnum,
  ): Promise<void> {
    const assets = await this.getContentUrlForMovie(movie, metadata, movieType);

    movie.updateBackgroundUrl(assets.backgroundContentUrl);
    movie.updateTrailerUrl(assets.trailerUrl);
    movie.updatePosterUrl(assets.posterUrl);
    movie.updateTitleUrl(assets.titleUrl);

    const moderationState = this.getUpcomingModerationState(this.createModerationSnapshot(movie));
    movie.showOrHiddeMovie(moderationState.hidden, moderationState.handleStatus);
  }

  private createUpdateDto<T extends MovieEntity>(
    movie: T,
    metadata: MovieKpMetadata,
    kpId: string,
  ): MovieUpdateDto {
    return {
      videUrl: movie.videoUrl,
      kpId,
      duration: movie.duration || 0,
      name: metadata.name || movie.title || 'unknown',
      originalName: metadata.originalName || movie.originalTitle,
      genres: metadata.genres || movie.genres || null,
      alternativeName: metadata.alternativeName || movie.alternativeTitles,
      universe: metadata.universe || movie.universe,
      studio: metadata.studio || movie.studio,
      country: metadata.countries || movie.country,
      description: metadata.description || movie.description,
      releaseDate: metadata.releaseDate || movie.releaseDate,
      previewUrl: movie.previewUrl || null,
      horizontalPreviewUrl: null,
      backgroundContentUrl: movie.backgroundContentUrl || null,
      trailerUrl: movie.trailerUrl || metadata.trailerUrl,
      titleUrl: movie.titleUrl || metadata.titleUrl,
    };
  }

  private getUpcomingModerationState(movie: UpcomingModerationSnapshot): {
    hidden: boolean;
    handleStatus: MovieHandleStatus;
  } {
    const isReadyForProduction = !!(
      this.hasText(movie.name) &&
      this.hasText(movie.alternativeName) &&
      this.hasRussianText(movie.description) &&
      this.hasText(movie.releaseDate) &&
      this.hasPlayablePremiereTrailer(movie.trailerUrl) &&
      this.hasProcessedImage(movie.previewUrl) &&
      movie.genres &&
      movie.genres.length > 0 &&
      movie.country &&
      movie.country.length > 0
    );

    return {
      hidden: !isReadyForProduction,
      handleStatus: isReadyForProduction
        ? MovieHandleStatus.PRODUCTION
        : MovieHandleStatus.MODERATE,
    };
  }

  private hasText(value: string | null): boolean {
    return Boolean(value && value.trim());
  }

  private hasRequiredUpcomingMetadata(metadata: MovieKpMetadata): boolean {
    return !!(
      this.hasText(metadata.name) &&
      this.hasText(metadata.alternativeName) &&
      this.hasRussianText(metadata.description) &&
      this.hasText(metadata.releaseDate) &&
      this.hasText(metadata.trailerUrl) &&
      this.hasText(metadata.posterUrl) &&
      metadata.genres &&
      metadata.genres.length > 0
    );
  }

  private hasProcessedImage(value: string | null): boolean {
    return this.hasMediaExtension(value, '.webp');
  }

  private hasProcessedPreviewClip(value: string | null): boolean {
    return this.hasMediaExtension(value, '.webm');
  }

  private hasProcessedTrailer(value: string | null): boolean {
    return Boolean(value && value.toLowerCase().split('?')[0].endsWith('/trailer/trailer.mp4'));
  }

  private hasRussianText(value: string | null | undefined): boolean {
    return Boolean(value?.trim() && /[А-Яа-яЁё]/.test(value));
  }

  private hasMediaExtension(value: string | null, extension: string): boolean {
    if (!value || !value.trim()) return false;

    try {
      const url = new URL(value);
      return url.pathname.toLowerCase().endsWith(extension);
    } catch {
      return value.toLowerCase().split('?')[0].endsWith(extension);
    }
  }

  private createModerationSnapshot(movie: MovieEntity): UpcomingModerationSnapshot {
    return {
      name: movie.title,
      alternativeName: movie.alternativeTitles,
      country: movie.country,
      description: movie.description,
      releaseDate: movie.releaseDate,
      genres: movie.genres,
      trailerUrl: movie.trailerUrl,
      backgroundContentUrl: movie.backgroundContentUrl,
      previewUrl: movie.previewUrl,
    };
  }

  private async getContentUrlForMovie(
    movie: MovieEntity,
    metadata: MovieKpMetadata,
    movieType: MovieTypesEnum,
  ): Promise<{
    backgroundContentUrl: string | null;
    trailerUrl: string | null;
    posterUrl: string | null;
    titleUrl: string | null;
  }> {
    const movieId = movie.id;
    const shouldHydrateBackground = !this.hasProcessedPreviewClip(movie.backgroundContentUrl);
    const shouldHydratePoster = !this.hasProcessedImage(movie.previewUrl);
    const shouldHydrateTitle = !this.hasProcessedImage(movie.titleUrl);
    const trailerSourceUrl = metadata.trailerUrl || movie.trailerUrl;
    const posterSourceUrl = metadata.posterUrl || movie.previewUrl;

    const [backgroundContentUrl, posterUrl, titleUrl] = await Promise.all([
      shouldHydrateBackground
        ? this.getAssetUrlOrNull(() =>
            this.moviesService.getBackgroundContentUrl(trailerSourceUrl, movieId, movieType),
          )
        : Promise.resolve(null),
      shouldHydratePoster
        ? this.getAssetUrlOrNull(() =>
            this.moviesService.getPosterUrl(posterSourceUrl, movieId, movieType),
          )
        : Promise.resolve(null),
      shouldHydrateTitle
        ? this.getAssetUrlOrNull(() =>
            this.moviesService.getLogoUrl(metadata.titleUrl, movieId, movieType),
          )
        : Promise.resolve(null),
    ]);

    const processedBackgroundUrl = backgroundContentUrl || movie.backgroundContentUrl;
    const trailerUrl =
      this.getProcessedTrailerUrl(processedBackgroundUrl) ||
      (this.hasPlayablePremiereTrailer(metadata.trailerUrl) ? metadata.trailerUrl : null) ||
      (this.hasPlayablePremiereTrailer(movie.trailerUrl) ? movie.trailerUrl : null);

    return { backgroundContentUrl, trailerUrl, posterUrl, titleUrl };
  }

  private async getAssetUrlOrNull(action: () => Promise<string | null>): Promise<string | null> {
    try {
      return await action();
    } catch {
      return null;
    }
  }

  private getProcessedTrailerUrl(backgroundContentUrl: string | null): string | null {
    if (!backgroundContentUrl) return null;

    const marker = '/preview_clip/background.webm';
    const cleanUrl = backgroundContentUrl.split('?')[0];
    if (!cleanUrl.toLowerCase().endsWith(marker)) return null;

    return `${cleanUrl.slice(0, -marker.length)}/trailer/trailer.mp4`;
  }

  private hasPlayablePremiereTrailer(value: string | null | undefined): boolean {
    if (!value?.trim()) return false;
    if (this.hasProcessedTrailer(value)) return true;

    try {
      const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
      return (
        hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be'
      );
    } catch {
      return false;
    }
  }

  private isForeignCountryList(countries: string[] | null): boolean {
    if (!countries || countries.length === 0) return false;
    return countries.every(country => !this.isRussianCountry(country));
  }

  private isRussianCountry(country: string): boolean {
    const normalized = country.trim().toLowerCase().replace(/ё/g, 'е');
    return (
      normalized === 'россия' || normalized === 'russia' || normalized === 'russian federation'
    );
  }
}
