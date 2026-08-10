import { MovieMetadataCardService } from '@/movies/application/movie-metadata-card.service';
import { MovieTypesEnum } from '@/common/types/types';
import { MovieAvailabilityStatus, MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';

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

  const completeMetadata = (): MovieKpMetadata => ({
    ...metadata(['США']),
    name: 'Movie',
    alternativeName: 'Movie 2026',
    description: 'Description',
    releaseDate: '2026-10-07',
    genres: [{} as never],
    posterUrl: 'https://image.example/poster.jpg',
    backdropUrl: 'https://image.example/backdrop.jpg',
    trailerUrl: 'https://youtube.com/watch?v=test',
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

  it('sends upcoming cards with missing images to moderation', () => {
    const dto = service.createMovieDto(
      {
        ...completeMetadata(),
        posterUrl: null,
      },
      '1264562',
    );

    expect(dto.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(dto.hidden).toBe(true);
  });

  it('publishes complete upcoming cards to production', () => {
    const dto = service.createMovieDto(completeMetadata(), '1264562');

    expect(dto.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(dto.hidden).toBe(false);
    expect(dto.previewUrl).toBe('https://image.example/poster.jpg');
    expect(dto.backgroundContentUrl).toBe('https://image.example/backdrop.jpg');
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
    expect(existingMovie.showOrHiddeMovie).toHaveBeenCalledWith(true, MovieHandleStatus.MODERATE);
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
