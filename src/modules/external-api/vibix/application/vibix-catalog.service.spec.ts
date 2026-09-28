import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';

describe('VibixCatalogService', () => {
  const createService = () => {
    const post = jest.fn();
    const config = {
      baseUrl: 'https://vibix.org/api/v1/',
      token: 'test-token',
    };
    const service = new VibixCatalogService(
      { setContext: jest.fn(), error: jest.fn() } as never,
      { axiosRef: { post } } as never,
      { getActiveConfig: jest.fn().mockResolvedValue(config) } as never,
    );
    return { service, post };
  };

  const movie = {
    id: 101,
    name: 'Тестовый фильм',
    type: 'movie',
    year: 2026,
    poster_url: 'https://cdn.example/poster.jpg',
    backdrop_url: 'https://cdn.example/backdrop.jpg',
    genre: ['драма'],
    country: ['Россия'],
    description: 'Описание',
  };

  it('maps Vibix records and uses their internal id for the player', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: { data: [movie], recordsFiltered: 1 },
    });

    const result = await service.getPage('films', 1, 25);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 101,
        name: 'Тестовый фильм',
        source: 'vibix',
        externalPlayer: {
          provider: 'vibix',
          lookupType: 'movie',
          lookupId: '101',
          mediaType: 'movie',
        },
      }),
    );
    expect(post).toHaveBeenCalledWith(
      'https://vibix.org/api/v1/publisher/catalog/data',
      expect.objectContaining({ filter: { type: ['movie'] } }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('keeps animation only in the cartoons catalogue', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [movie, { ...movie, id: 102, name: 'Мультфильм', genre: ['мультфильм'] }],
        recordsFiltered: 2,
      },
    });

    const cartoons = await service.getPage('cartoons', 1, 25);
    expect(cartoons.items.map(item => item.id)).toEqual([102]);
  });

  it('maps serial records to the series player type', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: { data: [{ ...movie, id: 201, type: 'serial' }], recordsFiltered: 1 },
    });

    const result = await service.getPage('serials', 1, 25);
    expect(result.items[0].externalPlayer).toEqual(
      expect.objectContaining({ lookupType: 'series', mediaType: 'series' }),
    );
  });
});
