import { NotFoundException } from '@nestjs/common';
import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';
import { VideoseedCatalogService } from '@/external-api/videoseed/application/videoseed-catalog.service';
import { KodikCatalogService } from '@/external-api/kodik/application/kodik-catalog.service';
import { ExternalBannerService } from '@/banner/application/external-banner.service';

describe('Public catalogue country restrictions', () => {
  const previousRole = process.env.APP_ROLE;
  beforeAll(() => {
    process.env.APP_ROLE = 'public';
  });
  afterAll(() => {
    if (previousRole === undefined) delete process.env.APP_ROLE;
    else process.env.APP_ROLE = previousRole;
  });
  const logger = { setContext: jest.fn(), error: jest.fn() };
  const record = (id: number, country: string[], animated = false) => ({
    id,
    name: `Title ${id}`,
    type: 'movie',
    country,
    genre: [animated ? 'мультфильм' : 'драма'],
    poster_url: 'https://images.example/poster.jpg',
    embed_code_new: `data-publisher-id="1" data-type="movie" data-id="${id}"`,
  });
  const vibix = (records: unknown[], fallback: unknown = null) => {
    const service = new VibixCatalogService(
      logger as never,
      {} as never,
      {} as never,
      { findByIds: jest.fn().mockResolvedValue(fallback) } as never,
    );
    jest
      .spyOn(service as any, 'requestCatalog')
      .mockResolvedValue({ data: records, recordsFiltered: 300 });
    return service;
  };

  it.each(['films', 'serials', 'cartoons'] as const)(
    'filters Russian co-productions and unknown origins from %s/search without breaking page offsets',
    async type => {
      const records = [
        record(1, ['США'], type === 'cartoons'),
        record(2, ['Россия'], type === 'cartoons'),
        record(3, ['США', 'RU'], type === 'cartoons'),
        record(4, [], type === 'cartoons'),
      ];
      if (type === 'serials')
        records.forEach(item => {
          item.type = 'serial';
        });
      const service = vibix(records);
      const page = await service.getPage(type, 1, 'Title');
      expect(page.items.map(item => item.id)).toEqual([1]);
      expect(page.pagesCount).toBe(2);
      await expect(service.getById(2)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getById(3)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getById(4)).rejects.toBeInstanceOf(NotFoundException);
      expect((await service.getById(1)).id).toBe(1);
    },
  );

  it('also rejects a Russian production disclosed by the fallback provider', async () => {
    const service = vibix([record(1, ['США'])], { countries: ['Россия'] });
    await expect(service.getById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks alternate Videoseed IDs as well as search results', async () => {
    const items = [
      { id: '1', countries: ['Япония'], genres: [], seasons: [] },
      { id: '2', countries: ['Россия'], genres: [], seasons: [] },
      { id: '3', countries: [], genres: [], seasons: [] },
    ];
    const provider = { search: jest.fn().mockResolvedValue(items), getById: jest.fn() };
    const service = new VideoseedCatalogService(provider as never);
    // Only rejected records are converted below; no iframe can escape with a 404.
    provider.getById.mockResolvedValue(items[1]);
    await expect(service.getById('films', '2')).rejects.toBeInstanceOf(NotFoundException);
    provider.getById.mockResolvedValue(items[2]);
    await expect(service.getById('films', '3')).rejects.toBeInstanceOf(NotFoundException);
    provider.search.mockResolvedValue(items.slice(1));
    expect(await service.search('films', 'Title')).toEqual([]);
  });

  it('cannot bypass the restriction through Kodik routes or missing metadata', async () => {
    const records = [
      {
        id: 'serial-1',
        title: 'Allowed',
        link: '//kodikplayer.com/serial/1/test/720p',
        material_data: { countries: ['Япония'] },
      },
      {
        id: 'serial-2',
        title: 'Blocked',
        link: '//kodikplayer.com/serial/2/test/720p',
        material_data: { countries: ['Россия'] },
      },
      { id: 'serial-3', title: 'Unknown', link: '//kodikplayer.com/serial/3/test/720p' },
    ];
    const service = new KodikCatalogService(logger as never, {} as never, {} as never);
    jest.spyOn(service as any, 'request').mockResolvedValue({ results: records });
    expect((await service.getPage('anime')).items.map(item => item.id)).toEqual(['serial-1']);
    await expect(service.getById('anime', 'serial-2')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getById('dramas', 'serial-3')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('never generates banners for blocked or unverified titles, including standalone Videoseed fallback', async () => {
    const service = new ExternalBannerService(
      { getActiveConfigs: jest.fn().mockResolvedValue([{ token: 'test' }]) } as never,
      { getOrCreateDefault: jest.fn().mockResolvedValue({ provider: 'vibix' }) } as never,
      {
        getTopRecent: jest.fn().mockResolvedValue([{ country: ['Россия'] }, { country: [] }]),
      } as never,
      {
        getRecent: jest.fn().mockResolvedValue([{ id: '2' }]),
        getById: jest.fn().mockResolvedValue({ countries: ['Россия'] }),
      } as never,
      {
        getPage: jest
          .fn()
          .mockResolvedValue({ items: [{ countries: ['Россия'] }, { countries: [] }] }),
      } as never,
    );
    expect(await service.getCandidates()).toEqual([]);
  });
});
