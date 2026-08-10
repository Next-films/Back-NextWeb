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
    return {
      key: null,
      kpId,
      duration: 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      hidden: false,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      universe: metadata.universe,
      studio: metadata.studio,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      handleStatus: MovieHandleStatus.PRODUCTION,
      availabilityStatus: this.resolveAvailabilityStatus(metadata.releaseDate),
      trailerUrl: metadata.trailerUrl,
      backgroundContentUrl: null,
      horizontalPreviewUrl: null,
      previewUrl: null,
      titleUrl: null,
    };
  }

  async updateExistingMovie<T extends MovieEntity>(
    movie: T,
    metadata: MovieKpMetadata,
    kpId: string,
    movieType: MovieTypesEnum,
  ): Promise<T> {
    const updateDto = await this.createUpdateDto(movie, metadata, kpId, movieType);
    movie.update(updateDto);
    movie.showOrHiddeMovie(false, MovieHandleStatus.PRODUCTION);
    movie.updateAvailabilityStatus(this.resolveAvailabilityStatus(metadata.releaseDate));
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
  }

  private async createUpdateDto<T extends MovieEntity>(
    movie: T,
    metadata: MovieKpMetadata,
    kpId: string,
    movieType: MovieTypesEnum,
  ): Promise<MovieUpdateDto> {
    const assets = await this.getMissingContentUrlForMovie(movie, metadata, movieType);

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
      previewUrl: movie.previewUrl || assets.posterUrl,
      horizontalPreviewUrl: movie.horizontalPreviewUrl || assets.horizontalPreviewUrl,
      backgroundContentUrl: movie.backgroundContentUrl || assets.backgroundContentUrl,
      trailerUrl: movie.trailerUrl || metadata.trailerUrl,
      titleUrl: movie.titleUrl || assets.titleUrl,
    };
  }

  private async getMissingContentUrlForMovie<T extends MovieEntity>(
    movie: T,
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
      !movie.backgroundContentUrl
        ? this.moviesService.getBackgroundContentUrl(backgroundSourceUrl, movie.id, movieType)
        : Promise.resolve(null),
      !movie.horizontalPreviewUrl
        ? this.moviesService.getBackgroundContentUrl(
            metadata.backdropUrl,
            movie.id,
            movieType,
            'horizontal-posters',
          )
        : Promise.resolve(null),
      !movie.previewUrl
        ? this.moviesService.getPosterUrl(metadata.posterUrl, movie.id, movieType)
        : Promise.resolve(null),
      !movie.titleUrl
        ? this.moviesService.getLogoUrl(metadata.titleUrl, movie.id, movieType)
        : Promise.resolve(null),
    ]);

    return { backgroundContentUrl, horizontalPreviewUrl, posterUrl, titleUrl };
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
      this.moviesService.getBackgroundContentUrl(backgroundSourceUrl, movieId, movieType),
      this.moviesService.getBackgroundContentUrl(
        metadata.backdropUrl,
        movieId,
        movieType,
        'horizontal-posters',
      ),
      this.moviesService.getPosterUrl(metadata.posterUrl, movieId, movieType),
      this.moviesService.getLogoUrl(metadata.titleUrl, movieId, movieType),
    ]);

    return { backgroundContentUrl, horizontalPreviewUrl, posterUrl, titleUrl };
  }

  private resolveAvailabilityStatus(releaseDate: string | null): MovieAvailabilityStatus {
    if (!releaseDate) return MovieAvailabilityStatus.RELEASED_NO_VIDEO;

    const releaseTime = new Date(releaseDate).getTime();
    if (Number.isNaN(releaseTime)) return MovieAvailabilityStatus.RELEASED_NO_VIDEO;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return releaseTime > today.getTime()
      ? MovieAvailabilityStatus.UPCOMING
      : MovieAvailabilityStatus.RELEASED_NO_VIDEO;
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
