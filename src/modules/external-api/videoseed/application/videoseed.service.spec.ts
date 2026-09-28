import { VideoseedService } from '@/external-api/videoseed/application/videoseed.service';

describe('VideoseedService', () => {
  const createService = (token: string | null = 'api-key') => {
    const get = jest.fn();
    const service = new VideoseedService(
      { setContext: jest.fn(), error: jest.fn() } as never,
      { axiosRef: { get } } as never,
      {
        getActiveConfig: jest.fn().mockResolvedValue(token ? { baseUrl: '', token } : null),
      } as never,
    );
    return { service, get };
  };

  const record = {
    id: '1070024',
    name: 'Человек-паук: Новый день',
    original_name: 'Spider-Man: Brand New Day',
    year: '2026',
    id_kp: '5494049',
    id_imdb: 'tt22084616',
    poster: 'https://api.videoseed.tv/poster.jpg',
    description: 'Описание',
    genre: 'Боевик, Фантастика',
    country: 'США',
    actor: 'Зендея, Том Холланд',
    director: 'Дестин Дэниел Креттон',
    type: 'movie',
    time: '02:24:38',
    iframe: 'https://tv-1-kinoserial.net/embed/1070024/?token=player',
  };

  it('looks up by Kinopoisk id first and maps the record', async () => {
    const { service, get } = createService();
    get.mockResolvedValue({ data: { status: 'success', data: [record] } });

    const item = await service.findByIds({ kp: '5494049', imdb: 'tt22084616' }, 'movie');

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('https://api.videoseed.tv/apiv2.php', {
      params: { item: 'movie', token: 'api-key', kp: '5494049' },
      timeout: 10_000,
    });
    expect(item).toEqual(
      expect.objectContaining({
        id: '1070024',
        iframeUrl: 'https://tv-1-kinoserial.net/embed/1070024/?token=player',
        durationMinutes: 144,
        actors: ['Зендея', 'Том Холланд'],
      }),
    );
  });

  it('falls back to IMDb and caches misses to save the daily quota', async () => {
    const { service, get } = createService();
    get
      .mockResolvedValueOnce({ data: { status: 'error', data: 'no data' } })
      .mockResolvedValueOnce({ data: { status: 'error', data: 'no data' } });

    await service.findByIds({ kp: '1', imdb: 'tt1' }, 'serial');
    await service.findByIds({ kp: '1', imdb: 'tt1' }, 'serial');

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].params).toEqual(
      expect.objectContaining({ item: 'serial', imdb: 'tt1' }),
    );
  });

  it('does nothing without an active Videoseed config', async () => {
    const { service, get } = createService(null);

    expect(await service.findByIds({ kp: '1' }, 'movie')).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('maps serial seasons with a player link per episode', async () => {
    const { service, get } = createService();
    get.mockResolvedValue({
      data: {
        status: 'success',
        data: [
          {
            ...record,
            type: 'serial',
            iframe: 'https://tv-1-kinoserial.net/embed_serial/3738/?token=player',
            seasons: {
              1: {
                videos: {
                  2: { iframe: 'https://tv-1-kinoserial.net/embed/12/?token=player' },
                  1: {
                    iframe: 'https://tv-1-kinoserial.net/embed/11/?token=player',
                    preview: 'https://api.videoseed.tv/1.jpg',
                  },
                },
              },
            },
          },
        ],
      },
    });

    const item = await service.getById('3738', 'serial');

    expect(item?.seasons).toEqual([
      {
        number: 1,
        episodes: [
          {
            number: 1,
            title: null,
            iframeUrl: 'https://tv-1-kinoserial.net/embed/11/?token=player',
            previewUrl: 'https://api.videoseed.tv/1.jpg',
          },
          {
            number: 2,
            title: null,
            iframeUrl: 'https://tv-1-kinoserial.net/embed/12/?token=player',
            previewUrl: null,
          },
        ],
      },
    ]);
  });
});
