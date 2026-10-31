import { ReadyShortContentService } from './ready-short-content.service';
import { AdminReadyShortContentQueryDto } from '../../api/dtos/input/admin-ready-short-content.input.dto';

function fixture() {
  const worker = {
    readyClips: jest.fn().mockResolvedValue({
      clips: [
        {
          source: 'library',
          engineJobId: 'film-engine',
          clipIndex: 1,
          revision: 2,
          durationSec: 30,
          updatedAt: '2026-10-31T02:00:00Z',
          videoUrl: 'https://media/film.mp4?v=2',
          downloadUrl: 'https://media/film.mp4?download=1',
        },
        {
          source: 'library',
          engineJobId: 'removed-film',
          clipIndex: 1,
          revision: 1,
          durationSec: 30,
          updatedAt: '',
        },
        ...['abcdefghijk', 'lmnopqrstuv', 'zyxwvutsrqp'].map((videoId, i) => ({
          source: 'youtube',
          videoId,
          channelId: 'ours',
          revision: 3,
          durationSec: 40,
          updatedAt: `2026-10-31T0${i + 3}:00:00Z`,
          reviewRequired: i === 0,
        })),
      ],
    }),
  };
  const jobs = {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 10,
        shortContentJobId: 'film-engine',
        contentType: 'film',
        contentTitle: 'Наш фильм',
      },
    ]),
  };
  const sources = {
    find: jest
      .fn()
      .mockResolvedValue([{ channelId: 'ours', channelName: 'Наш канал', source: '@ours' }]),
  };
  const videos = {
    find: jest.fn().mockResolvedValue([
      {
        videoId: 'abcdefghijk',
        title: 'Наш Shorts — черновик',
        channelId: 'ours',
        isShort: true,
        lastSyncedAt: new Date(),
        downloadStatus: 'downloaded',
      },
      {
        videoId: 'lmnopqrstuv',
        title: 'Наш Shorts — проверен',
        channelId: 'ours',
        isShort: true,
        lastSyncedAt: new Date(),
        downloadStatus: 'downloaded',
      },
      {
        videoId: 'zyxwvutsrqp',
        title: 'Другой канал',
        channelId: 'disabled',
        isShort: true,
        lastSyncedAt: new Date(),
        downloadStatus: 'downloaded',
      },
    ]),
  };
  const service = new ReadyShortContentService(
    worker as any,
    jobs as any,
    videos as any,
    sources as any,
  );
  return { worker, jobs, sources, videos, service };
}

describe('Unified ready shelf', () => {
  it('joins final artifacts with eligible metadata, filters before global pagination and never changes publishing', async () => {
    const f = fixture();
    const query = Object.assign(new AdminReadyShortContentQueryDto(), { pageSize: 1 });
    const first = await f.service.list(query);
    expect(first.total).toBe(3);
    expect(first.counts).toEqual({ library: 1, youtube: 2 });
    expect(first.items[0].id).toBe('youtube:lmnopqrstuv:3');
    expect(first.items[0].reviewRequired).toBe(false);
    const last = await f.service.list({ ...query, page: 3 });
    expect(last.items[0].source).toBe('library');
    expect(last.items[0]).toMatchObject({ jobId: 10, title: 'Наш фильм', revision: 2 });
    expect(await f.service.list({ ...query, source: 'youtube', review: 'pending' })).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ title: 'Наш Shorts — черновик', reviewRequired: true })],
    });
    expect(await f.service.list({ ...query, search: 'ФИЛЬМ' })).toMatchObject({ total: 1 });
    expect(await f.service.list({ ...query, source: 'library' })).toMatchObject({ total: 1 });
    expect(f.videos.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isShort: true, downloadStatus: 'downloaded' }),
      }),
    );
  });

  it('never substitutes cached DB statuses when the worker is unavailable or malformed', async () => {
    const f = fixture();
    f.worker.readyClips.mockRejectedValueOnce(new Error('offline'));
    await expect(f.service.list(new AdminReadyShortContentQueryDto())).rejects.toThrow('offline');
    f.worker.readyClips.mockResolvedValueOnce({} as any);
    await expect(f.service.list(new AdminReadyShortContentQueryDto())).rejects.toThrow(
      'недоступен',
    );
  });

  it('omits disabled channels, ordinary or unverified videos and never queries an unbounded empty ID list', async () => {
    const f = fixture();
    f.videos.find.mockResolvedValueOnce([
      {
        videoId: 'abcdefghijk',
        channelId: 'ours',
        isShort: false,
        lastSyncedAt: new Date(),
        downloadStatus: 'downloaded',
      },
      {
        videoId: 'lmnopqrstuv',
        channelId: 'ours',
        isShort: true,
        lastSyncedAt: null,
        downloadStatus: 'downloaded',
      },
    ] as any);
    expect((await f.service.list(new AdminReadyShortContentQueryDto())).total).toBe(1);
    f.worker.readyClips.mockResolvedValueOnce({ clips: [] });
    f.videos.find.mockClear();
    expect((await f.service.list(new AdminReadyShortContentQueryDto())).total).toBe(0);
    expect(f.videos.find).not.toHaveBeenCalled();
  });
});
