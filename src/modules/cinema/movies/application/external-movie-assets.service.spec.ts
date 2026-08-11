import { MovieTypesEnum } from '@/common/types/types';
import { ExternalMovieAssetsService } from '@/movies/application/external-movie-assets.service';
import { MovieKpMetadata } from '@/movies/domain/types';

describe('ExternalMovieAssetsService', () => {
  const createMetadata = (): MovieKpMetadata => ({
    name: 'Movie',
    originalName: 'Original Movie',
    alternativeName: null,
    universe: null,
    studio: null,
    genres: null,
    countries: ['США'],
    description: null,
    releaseDate: null,
    posterUrl: null,
    backdropUrl: 'https://kp.example/primary.jpg',
    backdropUrls: ['https://kp.example/primary.jpg'],
    titleUrl: null,
    trailerUrl: null,
  });

  const createService = () => {
    const kinopoiskService = {
      getLandscapeImageUrlsByMovieId: jest
        .fn()
        .mockResolvedValue(['https://kp.example/primary.jpg', 'https://kp.example/landscape.jpg']),
    };
    const tmdbService = {
      getAssetCandidates: jest.fn().mockResolvedValue({
        tmdbId: 123,
        mediaType: 'movie',
        backdropUrls: ['https://tmdb.example/backdrop.jpg', 'https://kp.example/landscape.jpg'],
        trailerUrl: 'https://www.youtube.com/watch?v=tmdb',
      }),
    };
    const fanartService = {
      getMovieBackgroundUrls: jest.fn().mockResolvedValue(['https://fanart.example/bg.jpg']),
    };

    return {
      service: new ExternalMovieAssetsService(
        kinopoiskService as never,
        tmdbService as never,
        fanartService as never,
      ),
      kinopoiskService,
      tmdbService,
      fanartService,
    };
  };

  it('adds backdrop and trailer fallbacks for upcoming movies', async () => {
    const { service, tmdbService, fanartService } = createService();
    const metadata = createMetadata();

    await service.enrichUpcomingMetadata(
      metadata,
      {
        id: 42,
        externalId: { imdb: 'tt1234567' },
        year: 2026,
        name: 'Movie',
        enName: 'Original Movie',
      },
      MovieTypesEnum.FILM,
    );

    expect(tmdbService.getAssetCandidates).toHaveBeenCalledWith({
      movieType: MovieTypesEnum.FILM,
      tmdbId: null,
      imdbId: 'tt1234567',
      title: 'Movie',
      originalTitle: 'Original Movie',
      year: 2026,
    });
    expect(fanartService.getMovieBackgroundUrls).toHaveBeenCalledWith({
      tmdbId: 123,
      imdbId: 'tt1234567',
    });
    expect(metadata.trailerUrl).toBe('https://www.youtube.com/watch?v=tmdb');
    expect(metadata.backdropUrls).toEqual([
      'https://kp.example/primary.jpg',
      'https://kp.example/landscape.jpg',
      'https://tmdb.example/backdrop.jpg',
      'https://fanart.example/bg.jpg',
    ]);
  });

  it('does not call fallback providers when kinopoisk metadata is already rich enough', async () => {
    const { service, tmdbService, fanartService } = createService();
    const metadata: MovieKpMetadata = {
      ...createMetadata(),
      backdropUrls: ['https://kp.example/primary.jpg', 'https://kp.example/secondary.jpg'],
      trailerUrl: 'https://www.youtube.com/watch?v=kp',
    };

    await service.enrichUpcomingMetadata(metadata, { id: 42 }, MovieTypesEnum.CARTOON);

    expect(tmdbService.getAssetCandidates).not.toHaveBeenCalled();
    expect(fanartService.getMovieBackgroundUrls).not.toHaveBeenCalled();
    expect(metadata.trailerUrl).toBe('https://www.youtube.com/watch?v=kp');
  });

  it('skips fanart for serials because the current metadata has no tvdb id', async () => {
    const { service, tmdbService, fanartService } = createService();
    const metadata = createMetadata();

    await service.enrichUpcomingMetadata(
      metadata,
      { id: 42, externalId: { tmdb: 321 }, typeNumber: 2 },
      MovieTypesEnum.SERIAL,
    );

    expect(tmdbService.getAssetCandidates).toHaveBeenCalled();
    expect(fanartService.getMovieBackgroundUrls).not.toHaveBeenCalled();
  });
});
