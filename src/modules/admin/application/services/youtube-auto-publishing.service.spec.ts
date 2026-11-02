import { YoutubeAutoPublishingService } from './youtube-auto-publishing.service';
import { SocialPublishingRule } from '../../domain/social-publishing-rule.entity';
import { SocialYoutubeClip } from '../../domain/social-youtube-clip.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { YoutubeSource } from '../../domain/youtube-source.entity';

function fixture() {
  const rule = {
    isEnabled: true,
    autoEnqueueYoutube: true,
    sourceGroups: ['youtube'],
    pausedByFailure: false,
  };
  const rules = {
    find: jest.fn().mockResolvedValue([rule]),
    exist: jest.fn().mockResolvedValue(false),
  };
  const clips = { find: jest.fn().mockResolvedValue([]) };
  const videos = {
    findOneBy: jest.fn().mockResolvedValue({
      isShort: true,
      channelId: 'UC_test',
      lastSyncedAt: new Date(),
      downloadStatus: 'downloaded',
    }),
  };
  const sources = { find: jest.fn().mockResolvedValue([{ channelId: 'UC_test' }]) };
  const repositories = new Map<any, any>([
    [SocialPublishingRule, rules],
    [SocialYoutubeClip, clips],
    [YoutubeVideo, videos],
    [YoutubeSource, sources],
  ]);
  const runner = {
    connect: jest.fn(),
    query: jest.fn().mockResolvedValue([{ locked: true }]),
    release: jest.fn(),
  };
  const worker = {
    readyClips: jest.fn().mockResolvedValue({
      clips: [
        {
          source: 'youtube',
          videoId: 'abcdefghijk',
          channelId: 'UC_test',
          revision: 2,
          updatedAt: '2030-01-01',
        },
      ],
    }),
  };
  const publishing = { enqueueAutomaticYoutube: jest.fn().mockResolvedValue({}), tick: jest.fn() };
  const service = new YoutubeAutoPublishingService(
    { createQueryRunner: () => runner, getRepository: entity => repositories.get(entity) } as never,
    worker as never,
    publishing as never,
    { warn: jest.fn() } as never,
  );
  return { service, rule, rules, clips, videos, sources, runner, worker, publishing };
}

it('opts in only through an enabled rule and never publishes directly', async () => {
  const f = fixture();
  expect(await f.service.syncReadyClips()).toEqual({ added: 1, failed: 0, pending: 0 });
  expect(f.publishing.enqueueAutomaticYoutube).toHaveBeenCalledWith('abcdefghijk', 2);
  expect(f.publishing.tick).not.toHaveBeenCalled();
  expect(f.runner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1,$2)', [1793200000, 8]);
});

it('does not act without opt-in, during a global pause, or while another instance holds the lock', async () => {
  const f = fixture();
  f.rules.find.mockResolvedValue([]);
  await f.service.syncReadyClips();
  expect(f.worker.readyClips).not.toHaveBeenCalled();
  f.rules.find.mockResolvedValue([f.rule]);
  f.rules.exist.mockResolvedValue(true);
  await f.service.syncReadyClips();
  expect(f.worker.readyClips).not.toHaveBeenCalled();
  f.rules.exist.mockResolvedValue(false);
  f.runner.query.mockResolvedValue([{ locked: false }]);
  await f.service.syncReadyClips();
  expect(f.publishing.enqueueAutomaticYoutube).not.toHaveBeenCalled();
});

it('does not resurrect a published/deleted video or enqueue an edited revision again', async () => {
  const f = fixture();
  f.clips.find.mockResolvedValue([{ videoId: 'abcdefghijk', revision: 1, deletedAt: new Date() }]);
  await f.service.syncReadyClips();
  expect(f.publishing.enqueueAutomaticYoutube).not.toHaveBeenCalled();
});

it('rejects ordinary, disabled-channel, unverified and missing-download entries', async () => {
  const f = fixture();
  f.videos.findOneBy.mockResolvedValue({
    isShort: false,
    channelId: 'UC_test',
    lastSyncedAt: new Date(),
    downloadStatus: 'downloaded',
  });
  await f.service.syncReadyClips();
  f.videos.findOneBy.mockResolvedValue({
    isShort: true,
    channelId: 'UC_test',
    lastSyncedAt: null,
    downloadStatus: 'downloaded',
  });
  await f.service.syncReadyClips();
  f.videos.findOneBy.mockResolvedValue({
    isShort: true,
    channelId: 'UC_test',
    lastSyncedAt: new Date(),
    downloadStatus: 'skipped',
  });
  await f.service.syncReadyClips();
  f.sources.find.mockResolvedValue([]);
  await f.service.syncReadyClips();
  expect(f.publishing.enqueueAutomaticYoutube).not.toHaveBeenCalled();
});

it('bounds work to 25 snapshots, defers failures and continues with other videos on the next pass', async () => {
  const f = fixture();
  f.worker.readyClips.mockResolvedValue({
    clips: Array.from({ length: 30 }, (_, i) => ({
      source: 'youtube',
      videoId: String(i).padStart(11, '0'),
      channelId: 'UC_test',
      revision: 1,
      updatedAt: '2030-01-01',
    })),
  });
  f.publishing.enqueueAutomaticYoutube.mockRejectedValue(new Error('Stale revision'));
  expect(await f.service.syncReadyClips()).toEqual({ added: 0, failed: 25, pending: 5 });
  f.publishing.enqueueAutomaticYoutube.mockResolvedValue({});
  expect(await f.service.syncReadyClips()).toEqual({ added: 5, failed: 0, pending: 25 });
});

it('releases the cross-instance lock when the inventory is unavailable', async () => {
  const f = fixture();
  f.worker.readyClips.mockRejectedValueOnce(new Error('offline'));
  await expect(f.service.syncReadyClips()).rejects.toThrow('offline');
  expect(f.runner.release).toHaveBeenCalled();
  expect((await f.service.syncReadyClips()).added).toBe(1);
});
