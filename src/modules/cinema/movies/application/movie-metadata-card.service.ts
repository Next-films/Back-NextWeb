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

@Injectable()
export class MovieMetadataCardService {
  constructor(private readonly moviesService: MoviesService) {}

  shouldPublishUpcomingCard(metadata: MovieKpMetadata): boolean {
    return this.isForeignCountryList(metadata.countries);
  }

  createMovieDto(metadata: MovieKpMetadata, kpId: string): MovieCreateDto {
    const dto = {
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
      backgroundContentUrl: metadata.backdropUrl,
      horizontalPreviewUrl: metadata.backdropUrl,
      previewUrl: metadata.posterUrl,
      titleUrl: metadata.titleUrl,
    };
    const moderationState = this.getUpcomingModerationState(dto);

    return {
      ...dto,
      ...moderationState,
    };
  }

  updateExistingMovie<T extends MovieEntity>(movie: T, metadata: MovieKpMetadata, kpId: string): T {
    const updateDto = this.createUpdateDto(movie, metadata, kpId);
    const moderationState = this.getUpcomingModerationState(updateDto);

    movie.update(updateDto);
    movie.showOrHiddeMovie(moderationState.hidden, moderationState.handleStatus);
    movie.updateAvailabilityStatus(MovieAvailabilityStatus.UPCOMING);
    return movie;
  }

  async hydrateNewMovieAssets<T extends MovieEntity>(
    movie: T,
    metadata: MovieKpMetadata,
    movieType: MovieTypesEnum,
  ): Promise<void> {
    if (movie.availabilityStatus === MovieAvailabilityStatus.UPCOMING) return;

    const assets = await this.getContentUrlForMovie(movie.id, metadata, movieType);

    movie.updateBackgroundUrl(assets.backgroundContentUrl);
    movie.updatePosterUrl(assets.posterUrl);
    movie.updateHorizontalPreviewUrl(assets.horizontalPreviewUrl);
    movie.updateTitleUrl(assets.titleUrl);
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
      previewUrl: movie.previewUrl || metadata.posterUrl,
      horizontalPreviewUrl: movie.horizontalPreviewUrl || metadata.backdropUrl,
      backgroundContentUrl: movie.backgroundContentUrl || metadata.backdropUrl,
      trailerUrl: movie.trailerUrl || metadata.trailerUrl,
      titleUrl: movie.titleUrl || metadata.titleUrl,
    };
  }

  private getUpcomingModerationState(
    movie: Pick<
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
    >,
  ): { hidden: boolean; handleStatus: MovieHandleStatus } {
    const isReadyForProduction = !!(
      this.hasText(movie.name) &&
      this.hasText(movie.alternativeName) &&
      this.hasText(movie.description) &&
      this.hasText(movie.releaseDate) &&
      this.hasText(movie.trailerUrl) &&
      this.hasText(movie.backgroundContentUrl) &&
      this.hasText(movie.previewUrl) &&
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
    const backgroundSourceUrl = metadata.backdropUrl || metadata.trailerUrl;
    const [backgroundContentUrl, horizontalPreviewUrl, posterUrl, titleUrl] = await Promise.all([
      this.getAssetUrlOrNull(() =>
        this.moviesService.getBackgroundContentUrl(backgroundSourceUrl, movieId, movieType),
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
