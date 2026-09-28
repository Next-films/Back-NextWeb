import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';

describe('VibixCatalogService', () => {
  const createService = () => {
    const post = jest.fn();
    const videoseed = { findByIds: jest.fn().mockResolvedValue(null) };
    const config = {
      baseUrl: 'https://vibix.org/api/v1/',
      token: 'test-token',
    };
    const service = new VibixCatalogService(
      { setContext: jest.fn(), error: jest.fn() } as never,
      { axiosRef: { post } } as never,
      { getActiveConfig: jest.fn().mockResolvedValue(config) } as never,
      videoseed as never,
    );
    return { service, post, videoseed };
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
    embed_code_new: 'data-publisher-id="1" data-type="movie" data-id="5001"',
  };

  it('maps Vibix records and uses the embed id for the player', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: { data: [movie], recordsFiltered: 1 },
    });

    const result = await service.getPage('films', 1);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 101,
        name: 'Тестовый фильм',
        source: 'vibix',
        externalPlayer: {
          provider: 'vibix',
          lookupType: 'movie',
          lookupId: '5001',
          mediaType: 'movie',
        },
      }),
    );
    expect(post).toHaveBeenCalledWith(
      'https://vibix.org/api/v1/publisher/catalog/data',
      expect.stringMatching(
        /length=150.*columns%5B0%5D%5Bdata%5D=year.*order%5B0%5D%5Bdir%5D=desc.*filter%5Btype%5D%5B0%5D=movie.*filter%5Bactivity%5D%5B0%5D=1/,
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );
  });

  it('keeps animation only in the cartoons catalogue', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          movie,
          { ...movie, id: 102, name: 'Мультфильм', genre: ['мультфильм'] },
          { ...movie, id: 103, name: 'Мультсериал', type: 'serial', genre: ['анимация'] },
        ],
        recordsFiltered: 3,
      },
    });

    const cartoons = await service.getPage('cartoons', 1);
    expect(cartoons.items.map(item => item.id)).toEqual([102, 103]);
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/filter%5Btype%5D%5B0%5D=movie.*filter%5Btype%5D%5B1%5D=serial/),
      expect.any(Object),
    );
  });

  it('does not mix animated series into the serials catalogue', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          { ...movie, id: 201, type: 'serial' },
          { ...movie, id: 202, type: 'serial', genre: ['аниме'] },
        ],
        recordsFiltered: 2,
      },
    });

    const serials = await service.getPage('serials', 1);
    expect(serials.items.map(item => item.id)).toEqual([201]);
  });

  it('maps serial records to the series player type', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          {
            ...movie,
            id: 201,
            type: 'serial',
            embed_code_new: 'data-publisher-id="1" data-type="series" data-id="7001"',
          },
        ],
        recordsFiltered: 1,
      },
    });

    const result = await service.getPage('serials', 1);
    expect(result.items[0].externalPlayer).toEqual(
      expect.objectContaining({ lookupType: 'series', mediaType: 'series', lookupId: '7001' }),
    );
  });

  it('uses catalogue preview aliases and expands relative image urls', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          {
            ...movie,
            poster_url: null,
            backdrop_url: null,
            preview: '/storage/posters/101.jpg',
            preview_backdrop: '//cdn.vibix.org/backdrops/101.jpg',
          },
        ],
        recordsFiltered: 1,
      },
    });

    const result = await service.getPage('films', 1);
    expect(result.items[0].previewUrl).toBe('https://vibix.org/storage/posters/101.jpg');
    expect(result.items[0].backgroundImg).toBe('https://cdn.vibix.org/backdrops/101.jpg');
  });

  it('uses a backdrop for the card and skips records without artwork', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          { ...movie, id: 103, poster_url: null, backdrop_url: null },
          {
            ...movie,
            id: 104,
            poster_url: null,
            backdrop_url: 'https://cdn.example/wide.jpg',
          },
        ],
        recordsFiltered: 2,
      },
    });

    const result = await service.getPage('films', 1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 104,
        previewUrl: 'https://cdn.example/wide.jpg',
        backgroundImg: 'https://cdn.example/wide.jpg',
      }),
    );
  });

  it('maps Russian description, ratings, persons and seasons', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          {
            ...movie,
            type: 'serial',
            description: 'English text',
            description_rus: 'Русское описание',
            kp_rating: '7.4',
            imdb_rating: 0,
            quality: 'FHD',
            voiceovers: [{ name: 'LostFilm' }, 'HDRezka'],
            persons: [
              { occupation: 'director', name_anyway: 'Режиссёр' },
              { occupation: 'actor', name_anyway: 'Актёр' },
            ],
            episodes: { 1: [1, 2, 3], 2: [1, 2] },
          },
        ],
        recordsFiltered: 1,
      },
    });

    const item = await service.getById(101);

    expect(item.description).toBe('Русское описание');
    expect(item.details).toEqual(
      expect.objectContaining({
        year: 2026,
        kpRating: 7.4,
        imdbRating: null,
        quality: 'FHD',
        voiceovers: ['LostFilm', 'HDRezka'],
        directors: ['Режиссёр'],
        actors: ['Актёр'],
        seasonsCount: 2,
        episodesCount: 5,
      }),
    );
  });

  it('filters cartoons by animation genres from the Vibix filter catalogue', async () => {
    const { service, post } = createService();
    post
      .mockResolvedValueOnce({
        data: {
          filters: {
            genre: {
              list: [
                { name: 'Драма', value: 1 },
                { name: 'Мультфильм', value: 7 },
                { name: 'Аниме', value: 9 },
              ],
            },
          },
        },
      })
      .mockResolvedValue({ data: { data: [], recordsFiltered: 0 } });

    await service.getPage('cartoons', 1);
    await service.getPage('cartoons', 2);

    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls[0][0]).toBe('https://vibix.org/api/v1/publisher/catalog/getFilters');
    expect(post.mock.calls[1][1]).toContain(
      'filter%5Bgenre%5D%5B0%5D=7&filter%5Bgenre%5D%5B1%5D=9',
    );
  });

  it('skips records that have no Vibix player yet', async () => {
    const { service, post } = createService();
    post.mockResolvedValue({
      data: { data: [movie, { ...movie, id: 102, embed_code_new: null }], recordsFiltered: 2 },
    });

    const result = await service.getPage('films', 1);

    expect(result.items.map(item => item.id)).toEqual([101]);
  });

  it('adds the Videoseed fallback player and fills missing details on the card', async () => {
    const { service, post, videoseed } = createService();
    post.mockResolvedValue({
      data: { data: [{ ...movie, description: null, kp_id: 555 }], recordsFiltered: 1 },
    });
    videoseed.findByIds.mockResolvedValue({
      iframeUrl: 'https://tv-1-kinoserial.net/embed/9/?token=t',
      description: 'Описание из Videoseed',
      countries: [],
      actors: ['Актёр'],
      directors: ['Режиссёр'],
      seasons: [],
    });

    const item = await service.getById(101);

    expect(videoseed.findByIds).toHaveBeenCalledWith({ kp: '555', imdb: null }, 'movie');
    expect(item.fallbackPlayer).toEqual({
      provider: 'videoseed',
      iframeUrl: 'https://tv-1-kinoserial.net/embed/9/?token=t',
    });
    expect(item.description).toBe('Описание из Videoseed');
    expect(item.details.actors).toEqual(['Актёр']);
  });

  it('prefers the Russian title and description from Videoseed over English ones', async () => {
    const { service, post, videoseed } = createService();
    post.mockResolvedValue({
      data: {
        data: [{ ...movie, name: 'Young Blood', name_rus: null, description: 'English text' }],
        recordsFiltered: 1,
      },
    });
    videoseed.findByIds.mockResolvedValue({
      iframeUrl: 'https://tv-1-kinoserial.net/embed/9/?token=t',
      name: 'Молодая кровь',
      description: 'Русское описание',
      countries: [],
      actors: [],
      directors: [],
      seasons: [],
    });

    const item = await service.getById(101);

    expect(item.name).toBe('Молодая кровь');
    expect(item.subTitle).toBe('');
    expect(item.description).toBe('Русское описание');
  });

  it('keeps Vibix Russian text even when Videoseed has its own', async () => {
    const { service, post, videoseed } = createService();
    post.mockResolvedValue({ data: { data: [movie], recordsFiltered: 1 } });
    videoseed.findByIds.mockResolvedValue({
      iframeUrl: 'https://tv-1-kinoserial.net/embed/9/?token=t',
      name: 'Другое название',
      description: 'Другое описание',
      countries: [],
      actors: [],
      directors: [],
      seasons: [],
    });

    const item = await service.getById(101);

    expect(item.name).toBe('Тестовый фильм');
    expect(item.description).toBe('Описание');
  });

  it('links Vibix episodes to the matching Videoseed episodes', async () => {
    const { service, post, videoseed } = createService();
    post.mockResolvedValue({
      data: {
        data: [
          {
            ...movie,
            type: 'serial',
            embed_code_new: 'data-publisher-id="1" data-type="series" data-id="7001"',
            episodes: { 1: [1, 2] },
          },
        ],
        recordsFiltered: 1,
      },
    });
    videoseed.findByIds.mockResolvedValue({
      iframeUrl: 'https://tv-1-kinoserial.net/embed_serial/9/?token=t',
      name: '',
      description: '',
      countries: [],
      actors: [],
      directors: [],
      seasons: [
        {
          number: 1,
          episodes: [
            {
              number: 2,
              title: null,
              iframeUrl: 'https://tv-1-kinoserial.net/embed/22/?token=t',
              previewUrl: null,
            },
          ],
        },
      ],
    });

    const item = await service.getById(101);

    expect(videoseed.findByIds).toHaveBeenCalledWith(expect.anything(), 'serial');
    expect(item.details.seasons[0].episodes).toEqual([
      { number: 1, title: null },
      {
        number: 2,
        title: null,
        iframeUrl: 'https://tv-1-kinoserial.net/embed/22/?token=t',
        previewUrl: null,
      },
    ]);
  });
});
