import { MovieTypesEnum } from '@/common/types/types';
import { TmdbService } from '@/external-api/tmdb/application/tmdb.service';

describe('TmdbService', () => {
  const createService = () => {
    const get = jest.fn();
    const externalApiConfigService = {
      getRotatedConfigs: jest.fn().mockResolvedValue([
        {
          baseUrl: 'https://api.themoviedb.org',
          token: 'test-api-key',
        },
      ]),
    };
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    return {
      service: new TmdbService(
        logger as never,
        { axiosRef: { get } } as never,
        externalApiConfigService as never,
      ),
      get,
    };
  };

  it('requests Russian, English and language-neutral trailers for TV series', async () => {
    const { service, get } = createService();
    get.mockResolvedValue({
      data: {
        results: [
          {
            key: 'russian-trailer',
            site: 'YouTube',
            type: 'Trailer',
            official: true,
            iso_639_1: 'ru',
          },
        ],
      },
    });

    const result = await service.getTrailerCandidate({
      movieType: MovieTypesEnum.SERIAL,
      tmdbId: 42,
    });

    expect(result).toBe('https://www.youtube.com/watch?v=russian-trailer');
    expect(get).toHaveBeenCalledWith(
      '/tv/42/videos',
      expect.objectContaining({
        params: expect.objectContaining({
          language: 'ru-RU',
          include_video_language: 'ru,en,null',
        }),
      }),
    );
  });

  it('falls back from Russian to English movie trailers', async () => {
    const { service, get } = createService();
    get.mockResolvedValueOnce({ data: { results: [] } }).mockResolvedValueOnce({
      data: {
        results: [
          {
            key: 'english-trailer',
            site: 'YouTube',
            type: 'Trailer',
            official: true,
            iso_639_1: 'en',
          },
        ],
      },
    });

    const result = await service.getTrailerCandidate({
      movieType: MovieTypesEnum.FILM,
      tmdbId: 42,
    });

    expect(result).toBe('https://www.youtube.com/watch?v=english-trailer');
    expect(get.mock.calls.map(([, config]) => config.params.language)).toEqual(['ru-RU', 'en-US']);
  });

  it('prefers a Russian trailer when both languages have equivalent candidates', async () => {
    const { service, get } = createService();
    get
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              key: 'russian-trailer',
              site: 'YouTube',
              type: 'Trailer',
              official: true,
              iso_639_1: 'ru',
              size: 1080,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              key: 'english-trailer',
              site: 'YouTube',
              type: 'Trailer',
              official: true,
              iso_639_1: 'en',
              size: 1080,
            },
          ],
        },
      });

    const result = await service.getTrailerCandidate({
      movieType: MovieTypesEnum.CARTOON,
      tmdbId: 42,
    });

    expect(result).toBe('https://www.youtube.com/watch?v=russian-trailer');
  });
});
