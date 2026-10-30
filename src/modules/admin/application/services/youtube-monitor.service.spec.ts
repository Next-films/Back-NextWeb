/* eslint-disable @typescript-eslint/require-await -- In-memory async repository stubs match TypeORM's promise interface. */
import { YoutubeMonitorService } from './youtube-monitor.service';
import { YoutubeSource } from '../../domain/youtube-source.entity';
import { YoutubeVideoOwnerError } from './youtube-reader.service';

const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
const videoId = 'LOP8ul3KqQI';
const source = 'https://www.youtube.com/@ours';
const before = new Date('2026-01-01');
const detail = {
  videoId,
  channelId,
  title: 'Новый заголовок',
  description: 'Описание',
  thumbnailUrl: null,
  publishedAt: before,
  likes: '42',
  comments: '3',
  commentsReadFailed: false,
};

function fixture() {
  const sourceRows: any[] = [
    { source, enabled: true, channelId, channelName: 'Наш канал', lastSyncedAt: before },
  ];
  const videoRows = new Map<string, any>([
    [
      videoId,
      {
        ...detail,
        likes: '10',
        comments: '2',
        commentsUpdatedAt: before,
        description: 'Старое описание',
        lastSyncedAt: before,
        firstSeenAt: before,
      },
    ],
  ]);
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([key, value]) => row[key] === value);
  const sources = {
    find: jest.fn(async (options: any) =>
      sourceRows.filter(row => matches(row, options.where)).map(row => ({ ...row })),
    ),
    exist: jest.fn(async (options: any) => sourceRows.some(row => matches(row, options.where))),
    update: jest.fn(async (where: any, patch: any) => {
      for (const row of sourceRows) if (matches(row, where)) Object.assign(row, patch);
    }),
  };
  const builder: any = {
    where: jest.fn((_sql, params) => {
      builder.ids = params.channelIds;
      builder.downloaded = false;
      builder.short = false;
      builder.verified = false;
      return builder;
    }),
    andWhere: jest.fn((sql: string, params?: any) => {
      if (params?.downloadStatus) builder.downloaded = true;
      if (sql.includes('"isShort"')) builder.short = true;
      if (sql.includes('"lastSyncedAt"')) builder.verified = true;
      return builder;
    }),
    orderBy: jest.fn(() => builder),
    addOrderBy: jest.fn(() => builder),
    skip: jest.fn((offset: number) => {
      builder.offset = offset;
      return builder;
    }),
    take: jest.fn((limit: number) => {
      builder.limit = limit;
      return builder;
    }),
    getManyAndCount: jest.fn(async () => {
      const rows = [...videoRows.values()].filter(
        row =>
          builder.ids.includes(row.channelId) &&
          (!builder.downloaded || row.downloadStatus === 'downloaded') &&
          (!builder.short || row.isShort === true) &&
          (!builder.verified || row.lastSyncedAt != null),
      );
      return [rows.slice(builder.offset, builder.offset + builder.limit), rows.length];
    }),
  };
  const videos = {
    findOneBy: jest.fn(async ({ videoId: id }) => videoRows.get(id) ?? null),
    create: (data: any) => data,
    save: jest.fn(async (data: any) => {
      videoRows.set(data.videoId, { ...data });
      return data;
    }),
    update: jest.fn(async ({ videoId: id }, patch: any) => Object.assign(videoRows.get(id), patch)),
    createQueryBuilder: () => builder,
  };
  const runner = {
    connect: jest.fn(),
    query: jest.fn().mockResolvedValue([{ locked: true }]),
    release: jest.fn(),
  };
  const manager = {
    query: jest.fn(),
    update: jest.fn(async (_entity, where, patch) => sources.update(where, patch)),
    upsert: jest.fn(async (_entity, rows) => {
      for (const row of rows) {
        const existing = sourceRows.find(item => item.source === row.source);
        if (existing) Object.assign(existing, row);
        else sourceRows.push({ ...row, channelId: null });
      }
    }),
  };
  const database = {
    createQueryRunner: () => runner,
    transaction: (callback: any) => callback(manager),
  };
  const reader = {
    coolingDown: false,
    readChannel: jest.fn().mockResolvedValue({
      channelId,
      channelName: 'Наш канал',
      videos: [{ videoId, title: 'Наш ролик', thumbnailUrl: null }],
    }),
    readVideo: jest.fn().mockResolvedValue(detail),
  };
  const monitor = new YoutubeMonitorService(
    database as any,
    sources as any,
    videos as any,
    reader as any,
  );
  jest.spyOn(monitor, 'pause').mockResolvedValue();
  const finish = async () => {
    await (monitor as any).active;
  };
  return { monitor, sources, videos, reader, runner, sourceRows, videoRows, manager, finish };
}

describe('YouTube monitoring cache and background sync', () => {
  it('filters downloaded verified Shorts before pagination and counts; never calls YouTube', async () => {
    const f = fixture();
    const base = { ...f.videoRows.get(videoId), isShort: true, downloadStatus: 'downloaded' };
    f.videoRows.set(videoId, base);
    for (const [id, patch] of [
      ['downloaded2', {}],
      ['queued', { downloadStatus: 'queued' }],
      ['failed', { downloadStatus: 'failed' }],
      ['deleted', { downloadStatus: 'skipped' }],
      ['regular', { isShort: false }],
      ['unverified', { lastSyncedAt: null }],
      ['disabled', { channelId: 'UC_disabled_channel' }],
    ] as const) {
      f.videoRows.set(id, { ...base, ...patch, videoId: id });
    }
    const result = await f.monitor.overview({ page: 2, pageSize: 1, view: 'downloaded' });
    expect(result.total).toBe(2);
    expect(result.videos).toEqual([expect.objectContaining({ videoId: 'downloaded2' })]);
    expect(f.reader.readChannel).not.toHaveBeenCalled();
    expect(f.reader.readVideo).not.toHaveBeenCalled();
    const unmatched = await f.monitor.overview({
      page: 1,
      pageSize: 12,
      view: 'downloaded',
      source: '@other',
    });
    expect(unmatched.total).toBe(0);
    expect(unmatched.videos).toEqual([]);
  });

  it('saves a validated deduplicated account list atomically; removal hides but does not delete cached videos', async () => {
    const f = fixture();
    await expect(f.monitor.saveAccounts(['https://45.9.117.71/'])).rejects.toThrow();
    expect(f.manager.query).not.toHaveBeenCalled();
    expect(await f.monitor.saveAccounts(['@OURS', source])).toEqual({ accounts: [source] });
    expect(f.manager.upsert).toHaveBeenCalledWith(
      YoutubeSource,
      [{ source, enabled: true }],
      ['source'],
    );
    await f.monitor.saveAccounts([]);
    expect((await f.monitor.overview({ page: 1, pageSize: 12 })).videos).toEqual([]);
    expect(f.videoRows.has(videoId)).toBe(true);
    await f.monitor.saveAccounts(['@ours']);
    expect((await f.monitor.overview({ page: 1, pageSize: 12 })).total).toBe(1);
  });

  it('reading the admin page only reads the database, never calls YouTube', async () => {
    const f = fixture();
    const result = await f.monitor.overview({ page: 1, pageSize: 12 });
    expect(result.accounts).toEqual([source]);
    expect(result.videos).toHaveLength(1);
    expect(f.reader.readChannel).not.toHaveBeenCalled();
    expect(f.reader.readVideo).not.toHaveBeenCalled();
  });

  it('coalesces duplicate starts and releases the database-wide lock after a successful update', async () => {
    const f = fixture();
    expect(f.monitor.startSync()).toMatchObject({ running: true, alreadyRunning: false });
    expect(f.monitor.startSync()).toMatchObject({ alreadyRunning: true });
    await f.finish();
    expect(f.reader.readChannel).toHaveBeenCalledTimes(1);
    expect(f.videoRows.get(videoId)).toMatchObject({
      description: 'Описание',
      likes: '42',
      comments: '3',
      lastError: null,
    });
    expect(f.runner.query).toHaveBeenLastCalledWith(
      'SELECT pg_advisory_unlock($1, $2)',
      expect.anything(),
    );
    expect(f.runner.release).toHaveBeenCalledTimes(1);
    expect((await f.monitor.overview({ page: 1, pageSize: 12 })).sync.running).toBe(false);
  });

  it('does no network work with an empty list or if another process holds the advisory lock', async () => {
    const empty = fixture();
    empty.sourceRows.length = 0;
    empty.monitor.startSync();
    await empty.finish();
    expect(empty.runner.connect).not.toHaveBeenCalled();
    expect(empty.reader.readChannel).not.toHaveBeenCalled();
    const busy = fixture();
    busy.runner.query.mockResolvedValue([{ locked: false }]);
    busy.monitor.startSync();
    await busy.finish();
    expect(busy.reader.readChannel).not.toHaveBeenCalled();
    expect(busy.runner.release).toHaveBeenCalledTimes(1);
  });

  it('a failed video refresh keeps previous description, counters and their success timestamp', async () => {
    const f = fixture();
    f.reader.readVideo.mockRejectedValue(new Error('YouTube changed'));
    f.monitor.startSync();
    await f.finish();
    expect(f.videoRows.get(videoId)).toMatchObject({
      description: 'Старое описание',
      likes: '10',
      comments: '2',
      lastSyncedAt: before,
    });
    expect(f.videoRows.get(videoId).lastError).toContain('последние');
    expect(f.sourceRows[0].lastError).toContain('1 видео');
  });

  it('a failed comments request keeps old comment count/date while description and likes can update', async () => {
    const f = fixture();
    f.reader.readVideo.mockResolvedValue({ ...detail, comments: null, commentsReadFailed: true });
    f.monitor.startSync();
    await f.finish();
    expect(f.videoRows.get(videoId)).toMatchObject({
      description: 'Описание',
      likes: '42',
      comments: '2',
      commentsUpdatedAt: before,
    });
    expect(f.videoRows.get(videoId).lastError).toContain('комментариев');
  });

  it('new inaccessible videos use null counters, not zeros; prior video files are not touched', async () => {
    const f = fixture();
    f.videoRows.clear();
    f.reader.readVideo.mockRejectedValue(new Error('unavailable'));
    f.monitor.startSync();
    await f.finish();
    expect(f.videoRows.get(videoId)).toMatchObject({
      likes: null,
      comments: null,
      description: null,
      lastSyncedAt: null,
    });
  });

  it('confirmed videos from another channel are not added even as incomplete placeholders', async () => {
    const f = fixture();
    f.videoRows.clear();
    f.reader.readVideo.mockRejectedValue(new YoutubeVideoOwnerError('Wrong owner'));
    f.monitor.startSync();
    await f.finish();
    expect(f.videoRows.size).toBe(0);
  });

  it('failed channels preserve cached videos and throttled readers cannot start another sync', async () => {
    const f = fixture();
    f.reader.readChannel.mockRejectedValue(new Error('blocked'));
    f.monitor.startSync();
    await f.finish();
    expect(f.videoRows.get(videoId).description).toBe('Старое описание');
    expect(f.sourceRows[0].lastSyncedAt).toBe(before);
    expect(f.sourceRows[0].lastError).toContain('Канал не обновлён');
    f.reader.coolingDown = true;
    expect(f.monitor.startSync()).toEqual({
      running: false,
      alreadyRunning: false,
      coolingDown: true,
    });
  });

  it('a source removed while syncing is not re-enabled by progress updates', async () => {
    const f = fixture();
    f.reader.readVideo.mockImplementation(async () => {
      await f.monitor.saveAccounts([]);
      return detail;
    });
    f.monitor.startSync();
    await f.finish();
    expect(f.sourceRows[0].enabled).toBe(false);
    expect((await f.monitor.overview({ page: 1, pageSize: 12 })).total).toBe(0);
  });

  it('filters cached content by configured channel IDs, not arbitrary user-supplied URLs', async () => {
    const f = fixture();
    const result = await f.monitor.overview({ page: 1, pageSize: 12, source: '@other' });
    expect(result.videos).toEqual([]);
    expect(f.reader.readChannel).not.toHaveBeenCalled();
  });
});
