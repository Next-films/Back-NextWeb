import { SocialPublishingService } from './social-publishing.service';
import {
  SocialPublication,
  SocialPublicationStatus as Status,
} from '../../domain/social-publication.entity';
import { SocialPublishingRule } from '../../domain/social-publishing-rule.entity';
import { SocialYoutubeClip } from '../../domain/social-youtube-clip.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';

function fixture() {
  const asset = {
    id: 'a'.repeat(64),
    videoId: 'abcdefghijk',
    revision: 2,
    deletedAt: null as Date | null,
  };
  const siblings = [asset];
  const published = {
    youtubeAssetId: asset.id,
    sourceGroup: 'youtube',
    ruleId: 1,
    status: Status.PUBLISHED,
  };
  const history = [published];
  const rules = [{ id: 1, sourceGroups: ['youtube'], isEnabled: true, pausedByFailure: false }];
  const clips = {
    findOneBy: jest.fn().mockResolvedValue(asset),
    findOne: jest.fn().mockResolvedValue(asset),
    find: jest.fn().mockImplementation(() => Promise.resolve(siblings)),
    update: jest.fn(),
  };
  const publications = {
    find: jest.fn().mockImplementation(() => Promise.resolve(history)),
    update: jest.fn(),
  };
  const videos = { update: jest.fn() };
  const repositories = new Map<any, any>([
    [SocialYoutubeClip, clips],
    [SocialPublication, publications],
    [YoutubeVideo, videos],
    [SocialPublishingRule, { find: jest.fn().mockImplementation(() => Promise.resolve(rules)) }],
  ]);
  const manager = { getRepository: entity => repositories.get(entity), query: jest.fn() };
  const worker = {
    deleteYoutubePublication: jest.fn().mockResolvedValue({ removed: true, sourceRemoved: true }),
  };
  const logger = { setContext: jest.fn(), warn: jest.fn() };
  const service = new SocialPublishingService(
    { transaction: callback => callback(manager) } as never,
    logger as never,
    {} as never,
    {} as never,
    { find: jest.fn().mockResolvedValue([published]) } as never,
    {} as never,
    worker as never,
  );
  const cleanup = () => (service as any).cleanupPublishedYoutubeClips();
  return {
    asset,
    siblings,
    published,
    history,
    rules,
    clips,
    publications,
    videos,
    worker,
    logger,
    manager,
    cleanup,
  };
}

describe('Published YouTube storage cleanup', () => {
  it('removes files only after all required publications, retains history and prevents automatic re-download', async () => {
    const f = fixture();
    await f.cleanup();
    expect(f.clips.findOne).toHaveBeenCalledWith({
      where: { id: f.asset.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(f.manager.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), [
      'social-youtube:abcdefghijk',
    ]);
    expect(f.worker.deleteYoutubePublication).toHaveBeenCalledWith(f.asset.id, {
      videoId: f.asset.videoId,
      revision: 2,
      sourceRevision: 2,
      removeSource: true,
    });
    expect(f.clips.update).toHaveBeenCalledWith(
      { id: f.asset.id },
      { deletedAt: expect.any(Date) },
    );
    expect(f.publications.update).toHaveBeenCalledWith(
      { youtubeAssetId: f.asset.id },
      { clipDeletedAt: expect.any(Date) },
    );
    expect(f.videos.update).toHaveBeenCalledWith(
      { videoId: f.asset.videoId },
      expect.objectContaining({ downloadStatus: 'skipped', downloadRetryAt: null }),
    );
  });

  it.each([Status.QUEUED, Status.SUBMITTING, Status.PROCESSING, Status.SCHEDULED, Status.FAILED])(
    'preserves a file referenced by an outstanding %s publication even for a disabled rule',
    async status => {
      const f = fixture();
      f.history.push({ ...f.published, ruleId: 9, status });
      await f.cleanup();
      expect(f.worker.deleteYoutubePublication).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'waits for another enabled or failure-paused YouTube rule (enabled=%s)',
    async enabled => {
      const f = fixture();
      f.rules.push({
        id: 2,
        sourceGroups: ['youtube'],
        isEnabled: enabled,
        pausedByFailure: !enabled,
      });
      await f.cleanup();
      expect(f.worker.deleteYoutubePublication).not.toHaveBeenCalled();
    },
  );

  it('ignores unrelated own rules and completely disabled rules', async () => {
    const f = fixture();
    f.rules.push({ id: 2, sourceGroups: ['own'], isEnabled: true, pausedByFailure: false });
    f.rules.push({ id: 3, sourceGroups: ['youtube'], isEnabled: false, pausedByFailure: false });
    await f.cleanup();
    expect(f.worker.deleteYoutubePublication).toHaveBeenCalledTimes(1);
  });

  it('retains source files while another approved revision still needs publication', async () => {
    const f = fixture();
    f.siblings.push({ ...f.asset, id: 'b'.repeat(64), revision: 3 });
    f.worker.deleteYoutubePublication.mockResolvedValue({ removed: true, sourceRemoved: false });
    await f.cleanup();
    expect(f.worker.deleteYoutubePublication).toHaveBeenCalledWith(
      f.asset.id,
      expect.objectContaining({ removeSource: false, sourceRevision: 3 }),
    );
    expect(f.videos.update).not.toHaveBeenCalled();
  });

  it('uses the latest approved revision even when an older snapshot finishes last', async () => {
    const f = fixture();
    f.siblings.push({ ...f.asset, id: 'b'.repeat(64), revision: 3, deletedAt: new Date() });
    await f.cleanup();
    expect(f.worker.deleteYoutubePublication).toHaveBeenCalledWith(
      f.asset.id,
      expect.objectContaining({ removeSource: true, sourceRevision: 3 }),
    );
  });

  it('preserves the download entry if the worker kept a newer unapproved edit', async () => {
    const f = fixture();
    f.worker.deleteYoutubePublication.mockResolvedValue({ removed: true, sourceRemoved: false });
    await f.cleanup();
    expect(f.publications.update).toHaveBeenCalled();
    expect(f.videos.update).not.toHaveBeenCalled();
  });

  it('retries cleanup failures without marking media deleted', async () => {
    const f = fixture();
    f.worker.deleteYoutubePublication.mockRejectedValueOnce(new Error('busy'));
    await f.cleanup();
    expect(f.clips.update).not.toHaveBeenCalled();
    expect(f.publications.update).not.toHaveBeenCalled();
    expect(f.videos.update).not.toHaveBeenCalled();
    expect(f.logger.warn).toHaveBeenCalled();
    await f.cleanup();
    expect(f.clips.update).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit deletion acknowledgement from the worker', async () => {
    const f = fixture();
    f.worker.deleteYoutubePublication.mockResolvedValue({ removed: false, sourceRemoved: false });
    await f.cleanup();
    expect(f.clips.update).not.toHaveBeenCalled();
  });
});
