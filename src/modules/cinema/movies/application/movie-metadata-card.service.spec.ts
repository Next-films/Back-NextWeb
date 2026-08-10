import { MovieMetadataCardService } from '@/movies/application/movie-metadata-card.service';
import { MovieTypesEnum } from '@/common/types/types';
import { MovieAvailabilityStatus, MovieKpMetadata } from '@/movies/domain/types';

describe('MovieMetadataCardService', () => {
  const service = new MovieMetadataCardService(null as never);

  const metadata = (countries: string[] | null): MovieKpMetadata => ({
    name: null,
    originalName: null,
    alternativeName: null,
    universe: null,
    studio: null,
    genres: null,
    countries,
    description: null,
    releaseDate: null,
    posterUrl: null,
    backdropUrl: null,
    titleUrl: null,
    trailerUrl: null,
  });

  it('allows upcoming cards for foreign movies', () => {
    expect(service.shouldPublishUpcomingCard(metadata(['США']))).toBe(true);
  });

  it('blocks upcoming cards for Russian or unknown origin', () => {
    expect(service.shouldPublishUpcomingCard(metadata(['Россия']))).toBe(false);
    expect(service.shouldPublishUpcomingCard(metadata(['США', 'Россия']))).toBe(false);
    expect(service.shouldPublishUpcomingCard(metadata(null))).toBe(false);
  });

  it('creates upcoming cards even when source release date is in the past', () => {
    const dto = service.createMovieDto(
      { ...metadata(['США']), releaseDate: '2020-04-15' },
      '1264562',
    );

    expect(dto.availabilityStatus).toBe(MovieAvailabilityStatus.UPCOMING);
  });

  it('keeps existing metadata cards in upcoming status', () => {
    const existingMovie = {
      videoUrl: null,
      duration: 0,
      title: 'Old',
      originalTitle: null,
      genres: null,
      alternativeTitles: null,
      universe: null,
      studio: null,
      country: ['США'],
      description: null,
      releaseDate: '2020-04-15',
      previewUrl: null,
      horizontalPreviewUrl: null,
      backgroundContentUrl: null,
      trailerUrl: null,
      titleUrl: null,
      update: jest.fn(),
      showOrHiddeMovie: jest.fn(),
      updateAvailabilityStatus: jest.fn(),
    };

    service.updateExistingMovie(
      existingMovie as never,
      { ...metadata(['США']), releaseDate: '2020-04-15' },
      '1264562',
    );

    expect(existingMovie.updateAvailabilityStatus).toHaveBeenCalledWith(
      MovieAvailabilityStatus.UPCOMING,
    );
  });

  it('does not hydrate downloader assets for upcoming cards', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn(),
      getPosterUrl: jest.fn(),
      getLogoUrl: jest.fn(),
    };
    const serviceWithMovies = new MovieMetadataCardService(moviesService as never);
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      updateBackgroundUrl: jest.fn(),
      updatePosterUrl: jest.fn(),
      updateHorizontalPreviewUrl: jest.fn(),
      updateTitleUrl: jest.fn(),
    };

    await serviceWithMovies.hydrateNewMovieAssets(
      movie as never,
      metadata(['США']),
      MovieTypesEnum.FILM,
    );

    expect(moviesService.getBackgroundContentUrl).not.toHaveBeenCalled();
    expect(moviesService.getPosterUrl).not.toHaveBeenCalled();
    expect(moviesService.getLogoUrl).not.toHaveBeenCalled();
    expect(movie.updateBackgroundUrl).not.toHaveBeenCalled();
  });
});
