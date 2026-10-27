import { PublicBannerController } from './public-banner.controller';
import { Banner } from '@/banner/domain/banner.entity';

describe('PublicBannerController manual and automatic sources', () => {
  it('can return automatic candidates while all manual banners are disabled', async () => {
    const automatic = [{ id: -1, source: 'videoseed', imageUrl: 'https://example.com/frame.jpg' }];
    const controller = new PublicBannerController(
      { setContext: jest.fn(), log: jest.fn() } as never,
      { findAllActive: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      { getCandidates: jest.fn().mockResolvedValue(automatic) } as never,
    );
    expect(await controller.getActiveBanners()).toEqual([]);
    expect(await controller.getExternalBanners()).toEqual(automatic);
  });

  it('an external-provider outage cannot affect manual banner delivery', async () => {
    const banner = Banner.create('https://example.com/manual.webp', '/detail/1?type=films', 1);
    banner.id = 1;
    const controller = new PublicBannerController(
      { setContext: jest.fn(), log: jest.fn(), error: jest.fn() } as never,
      { findAllActive: jest.fn().mockResolvedValue([banner]) } as never,
      { signMediaUrl: jest.fn().mockResolvedValue(banner.imageUrl) } as never,
      { getCandidates: jest.fn().mockRejectedValue(new Error('external unavailable')) } as never,
    );
    await expect(controller.getExternalBanners()).rejects.toThrow('external unavailable');
    expect((await controller.getActiveBanners())[0].imageUrl).toBe(banner.imageUrl);
  });
});
