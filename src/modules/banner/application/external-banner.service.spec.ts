import { ExternalBannerService } from './external-banner.service';
import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';

const create = (provider = PlaybackProvider.VIBIX) => {
  const configs = {
    getActiveConfigs: jest.fn().mockResolvedValue([{ token: 'secret-api-token' }]),
  };
  const playback = { getOrCreateDefault: jest.fn().mockResolvedValue({ provider }) };
  const vibix = {
    getTopRecent: jest.fn().mockResolvedValue([
      {
        id: 10,
        name: 'Vibix title',
        mediaType: 'films',
        backgroundImg: 'https://images.example.com/backdrop.jpg',
        previewUrl: 'https://images.example.com/poster.jpg',
        content: { backgroundUrl: 'https://images.example.com/backdrop.jpg' },
        details: { kpId: '301', imdbId: 'tt1' },
        externalPlayer: { mediaType: 'movie' },
      },
    ]),
  };
  const seedItem = {
    id: '20',
    kind: 'serial',
    name: 'Seed title',
    genres: [],
    bannerUrls: ['https://api.videoseed.tv/preview.jpg'],
    iframeUrl: 'https://player.example.com/?token=secret-player',
  };
  const seed = {
    findByIds: jest.fn().mockResolvedValue(seedItem),
    getRecent: jest.fn().mockResolvedValue([seedItem]),
    getById: jest.fn().mockResolvedValue(seedItem),
  };
  const kodik = {
    getPage: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'serial-abc',
          title: 'Anime title',
          section: 'anime',
          backdropUrl: 'https://images.example.com/anime.jpg',
        },
      ],
    }),
  };
  return {
    configs,
    playback,
    vibix,
    seed,
    kodik,
    service: new ExternalBannerService(
      configs as never,
      playback as never,
      vibix as never,
      seed as never,
      kodik as never,
    ),
  };
};

describe('ExternalBannerService', () => {
  it('does not return the verified Kinopoisk missing-backdrop image even though it responds HTTP 200', async () => {
    const { service, vibix } = create();
    const stub =
      'https://avatars.mds.yandex.net/get-ott/12808873/2a0000019ac9a31de3b4565f65a725a0fdd3/1344x756';
    vibix.getTopRecent.mockResolvedValue([
      {
        id: 10,
        name: 'Placeholder',
        mediaType: 'cartoons',
        backgroundImg: stub,
        previewUrl: stub,
        content: { backgroundUrl: stub },
        details: { kpId: '1', imdbId: null },
      },
    ] as never);
    const banners = await service.getCandidates();
    expect(banners.some(banner => banner.title === 'Placeholder')).toBe(false);
    expect(JSON.stringify(banners)).not.toContain(stub);
  });

  it('mixes configured providers, builds working site routes and never exposes player/API tokens', async () => {
    const { service } = create();
    const banners = await service.getCandidates();
    expect(banners.map(item => item.source)).toEqual(['vibix', 'videoseed', 'kodik']);
    expect(banners[0].linkUrl).toBe('/detail/10?type=films');
    expect(banners[1].linkUrl).toBe('/detail/20?type=serials&source=videoseed');
    expect(banners[2].linkUrl).toBe('/kodik/anime/serial-abc');
    expect(banners.every(item => item.id < 0 && item.openInNewTab === false)).toBe(true);
    expect(JSON.stringify(banners)).not.toContain('secret');
  });

  it('shares an in-flight cache, preserves stable IDs and isolates playback modes', async () => {
    const { service, vibix, playback, seed } = create();
    const [a, b] = await Promise.all([service.getCandidates(), service.getCandidates()]);
    expect(a).toEqual(b);
    expect(vibix.getTopRecent).toHaveBeenCalledTimes(1);
    playback.getOrCreateDefault.mockResolvedValue({ provider: PlaybackProvider.LEGACY });
    const legacy = await service.getCandidates();
    expect(legacy.every(item => item.source === 'kodik')).toBe(true);
    expect(seed.findByIds).toHaveBeenCalledTimes(1);
  });

  it('never calls disabled APIs', async () => {
    const { service, configs, vibix, seed, kodik } = create();
    configs.getActiveConfigs.mockResolvedValue([]);
    expect(await service.getCandidates()).toEqual([]);
    expect(vibix.getTopRecent).not.toHaveBeenCalled();
    expect(seed.findByIds).not.toHaveBeenCalled();
    expect(kodik.getPage).not.toHaveBeenCalled();
  });

  it('uses standalone VideoSeed previews when Vibix is unavailable', async () => {
    const { service, vibix, seed } = create();
    vibix.getTopRecent.mockRejectedValue(new Error('provider unavailable'));
    const banners = await service.getCandidates();
    expect(banners.some(item => item.source === 'videoseed')).toBe(true);
    expect(seed.getById).toHaveBeenCalledWith('20', 'serial');
  });

  it('drops unsafe URL schemes and tolerates outages of all external providers', async () => {
    const { service, vibix, seed, kodik } = create();
    vibix.getTopRecent.mockResolvedValue([
      {
        id: 10,
        name: 'Bad image',
        mediaType: 'films',
        backgroundImg: 'http://images.example.com/insecure.jpg',
        previewUrl: 'javascript:alert(1)',
        content: { backgroundUrl: 'file:///etc/passwd' },
        details: { kpId: '1', imdbId: null },
      },
    ] as never);
    seed.findByIds.mockRejectedValue(new Error('timeout'));
    seed.getRecent.mockRejectedValue(new Error('timeout'));
    kodik.getPage.mockRejectedValue(new Error('timeout'));
    expect(await service.getCandidates()).toEqual([]);
  });
});
