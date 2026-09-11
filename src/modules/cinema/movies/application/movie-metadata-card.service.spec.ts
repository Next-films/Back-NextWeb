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
    description: 'Описание фильма',
    releaseDate: '2026-10-07',
    genres: [{} as never],
    posterUrl: 'https://image.example/poster.jpg',
    backdropUrl: 'https://image.example/backdrop.jpg',
    trailerUrl: 'https://youtube.com/watch?v=test',
  });

  it('allows upcoming cards only for complete foreign metadata', () => {
    expect(service.shouldPublishUpcomingCard(completeMetadata())).toBe(true);
    expect(service.shouldCreateUpcomingCard(completeMetadata())).toBe(true);
  });

  it('blocks upcoming cards for Russian, unknown, or incomplete metadata', () => {
    expect(
      service.shouldPublishUpcomingCard({ ...completeMetadata(), countries: ['Россия'] }),
    ).toBe(false);
    expect(
      service.shouldPublishUpcomingCard({ ...completeMetadata(), countries: ['США', 'Россия'] }),
    ).toBe(false);
    expect(service.shouldPublishUpcomingCard({ ...completeMetadata(), countries: null })).toBe(
      false,
    );
    expect(service.shouldPublishUpcomingCard({ ...completeMetadata(), description: null })).toBe(
      false,
    );
    expect(service.shouldCreateUpcomingCard({ ...completeMetadata(), description: null })).toBe(
      true,
    );
    expect(service.shouldPublishUpcomingCard({ ...completeMetadata(), trailerUrl: null })).toBe(
      false,
    );
    expect(service.shouldPublishUpcomingCard({ ...completeMetadata(), posterUrl: null })).toBe(
      false,
    );
    expect(service.shouldPublishUpcomingCard({ ...completeMetadata(), genres: [] })).toBe(false);
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
        Promise.resolve(
          url ? 'https://cdn.example/preview-clip/film/42/preview_clip/background.webm' : null,
        ),
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
      updateTrailerUrl: jest.fn(function (this: { trailerUrl: string | null }, url) {
        this.trailerUrl = url;
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
    expect(movie.backgroundContentUrl).toBe(
      'https://cdn.example/preview-clip/film/42/preview_clip/background.webm',
    );
    expect(movie.trailerUrl).toBe('https://cdn.example/preview-clip/film/42/trailer/trailer.mp4');
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

  it('uses the YouTube trailer when trailer conversion fails', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn(() => Promise.resolve(null)),
      getPosterUrl: jest.fn(() => Promise.resolve('https://cdn.example/poster.webp')),
      getLogoUrl: jest.fn(() => Promise.resolve('https://cdn.example/logo.webp')),
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
      updateTrailerUrl: jest.fn(function (this: { trailerUrl: string | null }, url) {
        this.trailerUrl = url;
      }),
      updatePosterUrl: jest.fn(function (this: { previewUrl: string | null }, url) {
        if (url) this.previewUrl = url;
      }),
      updateHorizontalPreviewUrl: jest.fn(),
      updateTitleUrl: jest.fn(function (this: { titleUrl: string | null }, url) {
        if (url) this.titleUrl = url;
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

    expect(movie.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(movie.isHidden).toBe(false);
    expect(movie.trailerUrl).toBe(completeMetadata().trailerUrl);
    expect(movie.backgroundContentUrl).toBeNull();
  });

  it('does not hydrate horizontal preview for upcoming cards', async () => {
    const moviesService = {
      getBackgroundContentUrl: jest.fn((url: string | null) => {
        return Promise.resolve(
          url ? 'https://cdn.example/preview-clip/film/42/preview_clip/background.webm' : null,
        );
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
      updateTrailerUrl: jest.fn(function (this: { trailerUrl: string | null }, url) {
        this.trailerUrl = url;
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
      backgroundContentUrl: 'https://cdn.example/preview-clip/film/42/preview_clip/background.webm',
      trailerUrl: 'https://cdn.example/preview-clip/film/42/trailer/trailer.mp4',
      titleUrl: 'https://cdn.example/logo.webp',
      isHidden: true,
      updateBackgroundUrl: jest.fn(),
      updateTrailerUrl: jest.fn(function (this: { trailerUrl: string | null }, url) {
        this.trailerUrl = url;
      }),
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
      backgroundContentUrl: 'https://cdn.example/preview-clip/film/42/preview_clip/background.webm',
      trailerUrl: 'https://cdn.example/preview-clip/film/42/trailer/trailer.mp4',
      titleUrl: 'https://cdn.example/logo.webp',
      isHidden: true,
      updateBackgroundUrl: jest.fn(),
      updateTrailerUrl: jest.fn(function (this: { trailerUrl: string | null }, url) {
        this.trailerUrl = url;
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
