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

  it('creates upcoming cards in moderation until assets are processed', () => {
    const dto = service.createMovieDto(completeMetadata(), '1264562');

    expect(dto.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(dto.hidden).toBe(true);
    expect(dto.previewUrl).toBeNull();
    expect(dto.horizontalPreviewUrl).toBeNull();
    expect(dto.backgroundContentUrl).toBeNull();
  });

  it('publishes upcoming cards only after required assets are converted', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn((url: string | null) =>
        Promise.resolve(url ? 'https://cdn.example/trailer.webm' : null),
      ),
      getPosterUrl: jest.fn(() => Promise.resolve('https://cdn.example/poster.webp')),
      getLogoUrl: jest.fn(() => Promise.resolve('https://cdn.example/logo.webp')),
    };
    const serviceWithMovies = new MovieMetadataCardService(moviesService as never);
    const movie = {
      id: 42,
      ...serviceWithMovies.createMovieDto(completeMetadata(), '1264562'),
      title: 'Movie',
      alternativeTitles: 'Movie 2026',
      isHidden: true,
      updateBackgroundUrl: jest.fn(function (this: { backgroundContentUrl: string | null }, url) {
        this.backgroundContentUrl = url;
      }),
      updatePosterUrl: jest.fn(function (this: { previewUrl: string | null }, url) {
        if (url) this.previewUrl = url;
      }),
      updateHorizontalPreviewUrl: jest.fn(function (
        this: { horizontalPreviewUrl: string | null },
        url,
      ) {
        this.horizontalPreviewUrl = url;
      }),
      updateTitleUrl: jest.fn(function (this: { titleUrl: string | null }, url) {
        this.titleUrl = url;
      }),
      showOrHiddeMovie: jest.fn(function (
        this: { isHidden: boolean; handleStatus: MovieHandleStatus },
        isHidden,
        status,
      ) {
        this.isHidden = isHidden;
        this.handleStatus = status;
      }),
    };

    await serviceWithMovies.hydrateNewMovieAssets(
      movie as never,
      completeMetadata(),
      MovieTypesEnum.FILM,
    );

    expect(moviesService.getBackgroundContentUrl).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=test',
      42,
      MovieTypesEnum.FILM,
    );
    expect(moviesService.getPosterUrl).toHaveBeenCalledWith(
      'https://image.example/poster.jpg',
      42,
      MovieTypesEnum.FILM,
    );
    expect(movie.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(movie.isHidden).toBe(false);
    expect(movie.previewUrl).toBe('https://cdn.example/poster.webp');
    expect(movie.horizontalPreviewUrl).toBeNull();
    expect(movie.backgroundContentUrl).toBe('https://cdn.example/trailer.webm');
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

  it('keeps upcoming cards in moderation when required asset conversion fails', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn(() => Promise.resolve(null)),
      getPosterUrl: jest.fn(() => Promise.resolve('https://cdn.example/poster.webp')),
      getLogoUrl: jest.fn(() => Promise.resolve(null)),
    };
    const serviceWithMovies = new MovieMetadataCardService(moviesService as never);
    const movie = {
      id: 42,
      ...serviceWithMovies.createMovieDto(completeMetadata(), '1264562'),
      title: 'Movie',
      alternativeTitles: 'Movie 2026',
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      isHidden: true,
      updateBackgroundUrl: jest.fn(),
      updatePosterUrl: jest.fn(function (this: { previewUrl: string | null }, url) {
        if (url) this.previewUrl = url;
      }),
      updateHorizontalPreviewUrl: jest.fn(),
      updateTitleUrl: jest.fn(),
      showOrHiddeMovie: jest.fn(function (
        this: { isHidden: boolean; handleStatus: MovieHandleStatus },
        isHidden,
        status,
      ) {
        this.isHidden = isHidden;
        this.handleStatus = status;
      }),
    };

    await serviceWithMovies.hydrateNewMovieAssets(
      movie as never,
      completeMetadata(),
      MovieTypesEnum.FILM,
    );

    expect(movie.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(movie.isHidden).toBe(true);
  });

  it('does not hydrate horizontal preview for upcoming cards', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn((url: string | null) => {
        return Promise.resolve(url ? 'https://cdn.example/trailer.webm' : null);
      }),
      getPosterUrl: jest.fn(() => Promise.resolve('https://cdn.example/poster.webp')),
      getLogoUrl: jest.fn(() => Promise.resolve('https://cdn.example/logo.webp')),
    };
    const serviceWithMovies = new MovieMetadataCardService(moviesService as never);
    const movie = {
      id: 42,
      ...serviceWithMovies.createMovieDto(completeMetadata(), '1264562'),
      title: 'Movie',
      alternativeTitles: 'Movie 2026',
      isHidden: true,
      updateBackgroundUrl: jest.fn(function (this: { backgroundContentUrl: string | null }, url) {
        this.backgroundContentUrl = url;
      }),
      updatePosterUrl: jest.fn(function (this: { previewUrl: string | null }, url) {
        this.previewUrl = url;
      }),
      updateHorizontalPreviewUrl: jest.fn(function (
        this: { horizontalPreviewUrl: string | null },
        url,
      ) {
        this.horizontalPreviewUrl = url;
      }),
      updateTitleUrl: jest.fn(function (this: { titleUrl: string | null }, url) {
        this.titleUrl = url;
      }),
      showOrHiddeMovie: jest.fn(function (
        this: { isHidden: boolean; handleStatus: MovieHandleStatus },
        isHidden,
        status,
      ) {
        this.isHidden = isHidden;
        this.handleStatus = status;
      }),
    };

    await serviceWithMovies.hydrateNewMovieAssets(
      movie as never,
      completeMetadata(),
      MovieTypesEnum.FILM,
    );

    expect(moviesService.getBackgroundContentUrl).toHaveBeenCalledTimes(1);
    expect(moviesService.getBackgroundContentUrl).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=test',
      42,
      MovieTypesEnum.FILM,
    );
    expect(movie.previewUrl).toBe('https://cdn.example/poster.webp');
    expect(movie.horizontalPreviewUrl).toBeNull();
    expect(movie.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
  });

  it('skips already processed assets when rehydrating existing upcoming cards', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn(),
      getPosterUrl: jest.fn(),
      getLogoUrl: jest.fn(),
    };
    const serviceWithMovies = new MovieMetadataCardService(moviesService as never);
    const movie = {
      id: 42,
      ...serviceWithMovies.createMovieDto(completeMetadata(), '1264562'),
      title: 'Movie',
      alternativeTitles: 'Movie 2026',
      previewUrl: 'https://cdn.example/poster.webp',
      horizontalPreviewUrl: 'https://cdn.example/horizontal.webp',
      backgroundContentUrl: 'https://cdn.example/trailer.webm',
      titleUrl: 'https://cdn.example/logo.webp',
      isHidden: true,
      updateBackgroundUrl: jest.fn(),
      updatePosterUrl: jest.fn(),
      updateHorizontalPreviewUrl: jest.fn(),
      updateTitleUrl: jest.fn(),
      showOrHiddeMovie: jest.fn(function (
        this: { isHidden: boolean; handleStatus: MovieHandleStatus },
        isHidden,
        status,
      ) {
        this.isHidden = isHidden;
        this.handleStatus = status;
      }),
    };

    await serviceWithMovies.hydrateNewMovieAssets(
      movie as never,
      completeMetadata(),
      MovieTypesEnum.FILM,
    );

    expect(moviesService.getBackgroundContentUrl).not.toHaveBeenCalled();
    expect(moviesService.getPosterUrl).not.toHaveBeenCalled();
    expect(moviesService.getLogoUrl).not.toHaveBeenCalled();
    expect(movie.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(movie.isHidden).toBe(false);
  });

  it('keeps processed vertical preview without checking copied horizontal preview', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn(),
      getPosterUrl: jest.fn(() => Promise.resolve('https://cdn.example/poster.webp')),
      getLogoUrl: jest.fn(),
    };
    const serviceWithMovies = new MovieMetadataCardService(moviesService as never);
    const movie = {
      id: 42,
      ...serviceWithMovies.createMovieDto(completeMetadata(), '1264562'),
      title: 'Movie',
      alternativeTitles: 'Movie 2026',
      previewUrl: 'https://cdn.example/duplicated.webp',
      horizontalPreviewUrl: 'https://cdn.example/duplicated.webp',
      backgroundContentUrl: 'https://cdn.example/trailer.webm',
      titleUrl: 'https://cdn.example/logo.webp',
      isHidden: true,
      updateBackgroundUrl: jest.fn(),
      updatePosterUrl: jest.fn(function (this: { previewUrl: string | null }, url) {
        if (url) this.previewUrl = url;
      }),
      updateHorizontalPreviewUrl: jest.fn(function (
        this: { horizontalPreviewUrl: string | null },
        url,
      ) {
        this.horizontalPreviewUrl = url;
      }),
      updateTitleUrl: jest.fn(),
      showOrHiddeMovie: jest.fn(function (
        this: { isHidden: boolean; handleStatus: MovieHandleStatus },
        isHidden,
        status,
      ) {
        this.isHidden = isHidden;
        this.handleStatus = status;
      }),
    };

    await serviceWithMovies.hydrateNewMovieAssets(
      movie as never,
      completeMetadata(),
      MovieTypesEnum.FILM,
    );

    expect(moviesService.getBackgroundContentUrl).not.toHaveBeenCalled();
    expect(moviesService.getPosterUrl).not.toHaveBeenCalled();
    expect(moviesService.getLogoUrl).not.toHaveBeenCalled();
    expect(movie.previewUrl).toBe('https://cdn.example/duplicated.webp');
    expect(movie.horizontalPreviewUrl).toBe('https://cdn.example/duplicated.webp');
    expect(movie.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
  });
});
