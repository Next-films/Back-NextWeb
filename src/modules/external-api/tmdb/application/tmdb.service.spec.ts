import { MovieTypesEnum } from '@/common/types/types';
import { TmdbService } from '@/external-api/tmdb/application/tmdb.service';

describe('TmdbService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

  it('resolves and rotates TMDB addresses through DNS over HTTPS', async () => {
    const { service } = createService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        Status: 0,
        Answer: [
          { type: 1, data: '203.0.113.10' },
          { type: 28, data: '2001:db8::1' },
          { type: 1, data: '203.0.113.11' },
        ],
      }),
    });
    const resolver = service as unknown as {
      getTmdbAddress(): Promise<string>;
      lookupHostname(
        hostname: string,
        options: { all: boolean },
        callback: (
          error: Error | null,
          addresses: Array<{ address: string; family: number }>,
        ) => void,
      ): void;
    };

    await expect(resolver.getTmdbAddress()).resolves.toBe('203.0.113.10');
    await expect(resolver.getTmdbAddress()).resolves.toBe('203.0.113.11');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const lookupResult = await new Promise<Array<{ address: string; family: number }>>(
      (resolve, reject) => {
        resolver.lookupHostname('api.themoviedb.org', { all: true }, (error, addresses) => {
          if (error) reject(error);
          else resolve(addresses);
        });
      },
    );
    expect(lookupResult).toEqual([{ address: '203.0.113.10', family: 4 }]);
  });
});
