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
      getTrailerCandidate: jest.fn().mockResolvedValue('https://www.youtube.com/watch?v=tmdb'),
    };

    return {
      service: new ExternalMovieAssetsService(kinopoiskService as never, tmdbService as never),
      kinopoiskService,
      tmdbService,
    };
  };

  it('adds trailer fallback for upcoming movies', async () => {
    const { service, tmdbService } = createService();
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

    expect(tmdbService.getTrailerCandidate).toHaveBeenCalledWith({
      movieType: MovieTypesEnum.FILM,
      tmdbId: null,
      imdbId: 'tt1234567',
      title: 'Movie',
      originalTitle: 'Original Movie',
      year: 2026,
    });
    expect(metadata.trailerUrl).toBe('https://www.youtube.com/watch?v=tmdb');
    expect(metadata.backdropUrls).toEqual([
      'https://kp.example/primary.jpg',
      'https://kp.example/landscape.jpg',
    ]);
  });

  it('does not call fallback providers when trailer already exists', async () => {
    const { service, tmdbService } = createService();
    const metadata: MovieKpMetadata = {
      ...createMetadata(),
      backdropUrls: ['https://kp.example/primary.jpg', 'https://kp.example/secondary.jpg'],
      trailerUrl: 'https://www.youtube.com/watch?v=kp',
    };

    await service.enrichUpcomingMetadata(metadata, { id: 42 }, MovieTypesEnum.CARTOON);

    expect(tmdbService.getTrailerCandidate).not.toHaveBeenCalled();
    expect(metadata.trailerUrl).toBe('https://www.youtube.com/watch?v=kp');
  });
});
