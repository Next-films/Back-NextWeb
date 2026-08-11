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
  | 'horizontalPreviewUrl'
  | 'previewUrl'
>;

@Injectable()
export class MovieMetadataCardService {
  constructor(private readonly moviesService: MoviesService) {}

  shouldPublishUpcomingCard(metadata: MovieKpMetadata): boolean {
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
    const assets = await this.getContentUrlForMovie(movie.id, metadata, movieType);

    movie.updateBackgroundUrl(assets.backgroundContentUrl);
    movie.updatePosterUrl(assets.posterUrl);
    movie.updateHorizontalPreviewUrl(assets.horizontalPreviewUrl);
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
      horizontalPreviewUrl: movie.horizontalPreviewUrl || null,
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
      this.hasText(movie.description) &&
      this.hasText(movie.releaseDate) &&
      this.hasText(movie.trailerUrl) &&
      this.hasProcessedPreviewClip(movie.backgroundContentUrl) &&
      this.hasProcessedImage(movie.horizontalPreviewUrl) &&
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

  private hasProcessedImage(value: string | null): boolean {
    return this.hasMediaExtension(value, '.webp');
  }

  private hasProcessedPreviewClip(value: string | null): boolean {
    return this.hasMediaExtension(value, '.webm');
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
      horizontalPreviewUrl: movie.horizontalPreviewUrl,
      previewUrl: movie.previewUrl,
    };
  }

  private async getContentUrlForMovie(
    movieId: number,
    metadata: MovieKpMetadata,
    movieType: MovieTypesEnum,
  ): Promise<{
    backgroundContentUrl: string | null;
    horizontalPreviewUrl: string | null;
    posterUrl: string | null;
    titleUrl: string | null;
  }> {
    const [backgroundContentUrl, horizontalPreviewUrl, posterUrl, titleUrl] = await Promise.all([
      this.getAssetUrlOrNull(() =>
        this.moviesService.getBackgroundContentUrl(metadata.trailerUrl, movieId, movieType),
      ),
      this.getAssetUrlOrNull(() =>
        this.moviesService.getBackgroundContentUrl(
          metadata.backdropUrl,
          movieId,
          movieType,
          'horizontal-posters',
        ),
      ),
      this.getAssetUrlOrNull(() =>
        this.moviesService.getPosterUrl(metadata.posterUrl, movieId, movieType),
      ),
      this.getAssetUrlOrNull(() =>
        this.moviesService.getLogoUrl(metadata.titleUrl, movieId, movieType),
      ),
    ]);

    return { backgroundContentUrl, horizontalPreviewUrl, posterUrl, titleUrl };
  }

  private async getAssetUrlOrNull(action: () => Promise<string | null>): Promise<string | null> {
    try {
      return await action();
    } catch {
      return null;
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
