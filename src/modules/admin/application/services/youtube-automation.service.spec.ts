import { YoutubeAutomationService } from './youtube-automation.service';

function fixture() {
  const state = { enabled: true, includeArchive: true };
  const settings = { findOneBy: jest.fn(() => Promise.resolve(state)), update: jest.fn() };
  const source = {
    source: '@ours',
    enabled: true,
    channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    archiveComplete: false,
    archiveState: null,
  };
  const sources = {
    find: jest.fn().mockResolvedValue([source]),
    update: jest.fn(),
    exist: jest.fn().mockResolvedValue(true),
  };
  const qb: any = {};
  for (const name of ['where', 'andWhere', 'orderBy', 'addOrderBy', 'take'])
    qb[name] = jest.fn(() => qb);
  qb.getMany = jest.fn().mockResolvedValue([]);
  const videos = {
    createQueryBuilder: jest.fn(() => qb),
    update: jest.fn(),
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn(value => value),
    save: jest.fn(),
  };
  const runner = {
    connect: jest.fn(),
    query: jest.fn().mockResolvedValue([{ locked: true }]),
    release: jest.fn(),
  };
  const manager = {
    query: jest.fn().mockResolvedValue([{ locked: true }]),
    upsert: jest.fn(),
    update: jest.fn(),
  };
  const database = {
    createQueryRunner: () => runner,
    transaction: jest.fn(callback => callback(manager)),
  };
  const reader = {
    coolingDown: false,
    readShortsArchivePage: jest.fn().mockResolvedValue({ videos: [], nextToken: null }),
    readVideo: jest.fn(),
  };
  const processing = {
    status: jest.fn(),
    download: jest.fn().mockResolvedValue({ job: { status: 'queued' } }),
  };
  const worker = { youtubeQueue: jest.fn().mockResolvedValue({ enabled: true, capacity: 2 }) };
  const service = new YoutubeAutomationService(
    database as any,
    settings as any,
    sources as any,
    videos as any,
    reader as any,
    processing as any,
    worker as any,
  );
  return {
    service,
    state,
    settings,
    source,
    sources,
    videos,
    qb,
    runner,
    manager,
    reader,
    processing,
    worker,
  };
}

describe('Persisted YouTube Shorts automation', () => {
  it('refuses an archive reset while a shared synchroniser is running, instead of overwriting its cursor', async () => {
    const f = fixture();
    f.manager.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ locked: false }]);
    await expect(
      f.service.configure({ enabled: false, includeArchive: true, restartArchive: true }),
    ).rejects.toThrow('Дождитесь');
    expect(f.manager.upsert).not.toHaveBeenCalled();
    expect(f.manager.update).not.toHaveBeenCalled();
  });
  it('requires explicit all-channel consent, while allowing pause without consent', async () => {
    const f = fixture();
    jest.spyOn(f.service, 'overview').mockResolvedValue({} as any);
    const tick = jest.spyOn(f.service, 'tick').mockImplementation(() => {});
    for (const body of [
      null,
      {},
      { enabled: true, includeArchive: true },
      { enabled: 'true', includeArchive: true },
    ])
      await expect(f.service.configure(body)).rejects.toThrow('Подтвердите');
    expect(f.manager.upsert).not.toHaveBeenCalled();
    await f.service.configure({ enabled: false, includeArchive: true });
    expect(tick).not.toHaveBeenCalled();
    await f.service.configure({
      enabled: true,
      includeArchive: true,
      channelsConfirmed: true,
      restartArchive: true,
    });
    expect(f.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { enabled: true },
      expect.objectContaining({ archiveState: null, archiveComplete: false }),
    );
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('does no work while disabled and always releases the shared metadata lock', async () => {
    const f = fixture();
    f.state.enabled = false;
    await (f.service as any).run();
    expect(f.runner.connect).not.toHaveBeenCalled();
    f.state.enabled = true;
    f.runner.query.mockResolvedValue([{ locked: false }]);
    await (f.service as any).run();
    expect(f.worker.youtubeQueue).not.toHaveBeenCalled();
    expect(f.runner.release).toHaveBeenCalled();
  });

  it('refreshes completed jobs even with a full queue, and does not add jobs or advance archives', async () => {
    const f = fixture();
    f.worker.youtubeQueue.mockResolvedValue({ enabled: true, capacity: 0 } as any);
    f.qb.getMany.mockResolvedValue([{ videoId: 'abcdefghijk', downloadAttempts: 1 }]);
    f.processing.status.mockResolvedValue({ job: { originalAvailable: true } });
    await (f.service as any).run();
    expect(f.videos.update).toHaveBeenCalledWith(
      { videoId: 'abcdefghijk' },
      expect.objectContaining({ downloadStatus: 'downloaded' }),
    );
    expect(f.processing.download).not.toHaveBeenCalled();
    expect(f.reader.readShortsArchivePage).not.toHaveBeenCalled();
    expect(f.runner.query).toHaveBeenLastCalledWith(
      'SELECT pg_advisory_unlock($1,$2)',
      [1793200000, 1],
    );
  });

  it('only selects verified Shorts, prioritises newest and bounds retries, without rendering', async () => {
    const f = fixture();
    f.qb.getMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ videoId: 'abcdefghijk', downloadAttempts: 0 }]);
    await (f.service as any).run();
    expect(f.qb.andWhere).toHaveBeenCalledWith('video."isShort" = true');
    expect(f.qb.andWhere).toHaveBeenCalledWith('video."lastSyncedAt" IS NOT NULL');
    expect(
      f.qb.andWhere.mock.calls.some(([sql]: [string]) => sql.includes('"downloadAttempts" < 3')),
    ).toBe(true);
    expect(f.qb.orderBy).toHaveBeenCalledWith('video."publishedAt"', 'DESC', 'NULLS LAST');
    expect(f.processing.download).toHaveBeenCalledWith('abcdefghijk', {
      contentConfirmed: true,
      downloadOnly: true,
    });
    expect(f.videos.update).toHaveBeenCalledWith(
      { videoId: 'abcdefghijk' },
      expect.objectContaining({ downloadStatus: 'queued', downloadAttempts: 1 }),
    );
  });

  it('persists continuation progress and skips previously verified Shorts without downloading again', async () => {
    const f = fixture();
    f.videos.findOneBy.mockResolvedValue({
      channelId: f.source.channelId,
      isShort: true,
      lastSyncedAt: new Date(),
    });
    f.reader.readShortsArchivePage.mockResolvedValue({
      videos: [{ videoId: 'abcdefghijk', isShort: true }],
      nextToken: 'next-page',
    } as any);
    await (f.service as any).archive(f.source, Date.now() + 1000);
    expect(f.reader.readVideo).not.toHaveBeenCalled();
    expect(f.sources.update).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        archiveComplete: false,
        archiveState: { token: 'next-page', nextToken: null, loaded: false, pending: [] },
      }),
    );
    const state = {
      token: 'next-page',
      nextToken: null,
      loaded: true,
      pending: [{ videoId: 'zyxwvutsrqp', attempts: 1 }],
    };
    f.reader.readVideo.mockRejectedValue(new Error('temporary'));
    f.videos.findOneBy.mockResolvedValue(null);
    await (f.service as any).archive({ ...f.source, archiveState: state }, Date.now() + 1000);
    expect(state.pending[0].attempts).toBe(2);
    expect(f.reader.readShortsArchivePage).toHaveBeenCalledTimes(1);
    expect(f.sources.update).toHaveBeenCalledWith(expect.anything(), { archiveState: state });
  });

  it('does not burn retries for every pending video when the worker rejects submission', async () => {
    const f = fixture();
    f.qb.getMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { videoId: 'abcdefghijk', downloadAttempts: 1 },
        { videoId: 'zyxwvutsrqp' },
      ]);
    f.processing.download.mockRejectedValue(new Error('quota'));
    await (f.service as any).run();
    expect(f.processing.download).toHaveBeenCalledTimes(1);
    expect(f.videos.update).toHaveBeenCalledWith(
      { videoId: 'abcdefghijk' },
      expect.objectContaining({
        downloadStatus: 'failed',
        downloadAttempts: 2,
        downloadRetryAt: expect.any(Date),
      }),
    );
  });
});
