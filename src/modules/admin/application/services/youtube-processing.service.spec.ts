import { YoutubeProcessingService } from './youtube-processing.service';

function fixture() {
  const video = {
    videoId: 'LOP8ul3KqQI',
    channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    isShort: true,
    lastSyncedAt: new Date(),
  };
  const videos = { findOneBy: jest.fn().mockResolvedValue(video) };
  const sources = {
    findOneBy: jest
      .fn()
      .mockResolvedValue({ source: 'https://www.youtube.com/@ours', channelName: 'Наш канал' }),
  };
  const worker = {
    youtubeRequest: jest.fn().mockResolvedValue({ job: {} }),
    youtubeAsset: jest.fn(),
  };
  return {
    service: new YoutubeProcessingService(sources as any, videos as any, worker as any),
    video,
    sources,
    worker,
  };
}

describe('YouTube media eligibility', () => {
  it.each([false, null, undefined])(
    'never forwards a regular/unknown video to the downloader: %s',
    async isShort => {
      const f = fixture();
      Object.assign(f.video, { isShort });
      await expect(f.service.download(f.video.videoId, { contentConfirmed: true })).rejects.toThrow(
        'Shorts',
      );
      expect(f.worker.youtubeRequest).not.toHaveBeenCalled();
    },
  );
  it('requires verified ownership, an enabled channel, and explicit film-clip confirmation', async () => {
    const f = fixture();
    await expect(f.service.download(f.video.videoId, {})).rejects.toThrow('Confirm');
    Object.assign(f.video, { lastSyncedAt: null });
    await expect(f.service.download(f.video.videoId, { contentConfirmed: true })).rejects.toThrow(
      'Shorts',
    );
    Object.assign(f.video, { lastSyncedAt: new Date() });
    f.sources.findOneBy.mockResolvedValue(null);
    await expect(f.service.download(f.video.videoId, { contentConfirmed: true })).rejects.toThrow(
      'channel',
    );
    expect(f.worker.youtubeRequest).not.toHaveBeenCalled();
  });
  it('constructs its own safe worker payload, refusing client-supplied arbitrary URLs/proxies', async () => {
    const f = fixture();
    await f.service.download(f.video.videoId, {
      contentConfirmed: true,
      url: 'http://45.9.117.71/',
      proxy: 'attacker',
    });
    expect(f.worker.youtubeRequest).toHaveBeenCalledWith(
      'POST',
      f.video.videoId,
      expect.objectContaining({ channelId: f.video.channelId, isShort: true }),
    );
    expect(f.worker.youtubeRequest.mock.calls[0][2]).not.toHaveProperty('url');
    expect(f.worker.youtubeRequest.mock.calls[0][2]).not.toHaveProperty('proxy');
    await expect(f.service.asset('../private', 'original')).rejects.toThrow('ID');
    await expect(f.service.asset(f.video.videoId, '../state')).rejects.toThrow('artifact');
  });
});
