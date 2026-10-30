import { SocialPublishingService } from './social-publishing.service';
import { SocialPublication, SocialPublicationStatus } from '../../domain/social-publication.entity';
import {
  SocialPublishingRule,
  SocialPublishingProvider,
} from '../../domain/social-publishing-rule.entity';
import { ShortContentJob, ShortContentType } from '../../domain/short-content-job.entity';
import { SocialYoutubeClip } from '../../domain/social-youtube-clip.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { YoutubeSource } from '../../domain/youtube-source.entity';

function fixture() {
  const rule = {
    id: 7,
    provider: SocialPublishingProvider.POSTMYPOST,
    sourceGroups: ['own', 'youtube'],
    groupStrategy: 'alternate',
    firstGroup: 'own',
    ownPerCycle: 1,
    youtubePerCycle: 1,
    groupCursor: 0,
    fallbackToOtherGroup: true,
    contentTypes: ['film'],
    nextRunAt: new Date('2026-10-30T10:00:00Z'),
    intervalMinutes: 60,
    isEnabled: true,
  } as SocialPublishingRule;
  const own = [
    {
      id: 17,
      contentType: ShortContentType.FILM,
      draftPayload: {
        clips: [
          { index: 1, downloadUrl: 'https://media.example/1.mp4' },
          { index: 2, downloadUrl: 'https://media.example/2.mp4' },
        ],
      },
    },
  ];
  const youtube = [
    {
      id: 'a'.repeat(64),
      videoId: 'abcdefghijk',
      revision: 1,
      title: 'Проверенный Shorts',
      deletedAt: null as Date | null,
    },
  ];
  const used: SocialPublication[] = [];
  const query = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    setOnLocked: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(rule),
  };
  const repositories = new Map<any, any>([
    [SocialPublishingRule, { createQueryBuilder: () => query }],
    [ShortContentJob, { find: jest.fn().mockImplementation(() => Promise.resolve(own)) }],
    [
      SocialYoutubeClip,
      {
        find: jest.fn().mockImplementation(() => Promise.resolve(youtube)),
        findOne: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(youtube.find(item => item.id === where.id && !item.deletedAt) ?? null),
          ),
      },
    ],
    [
      SocialPublication,
      {
        find: jest.fn().mockImplementation(() => Promise.resolve(used)),
        create: (value: unknown) => value,
      },
    ],
  ]);
  const manager = {
    getRepository: (entity: unknown) => repositories.get(entity),
    save: jest.fn().mockImplementation(value => {
      if ('ruleId' in value) used.push({ ...value, id: used.length + 1 });
      return Promise.resolve(value);
    }),
  };
  const service = new SocialPublishingService(
    { transaction: callback => callback(manager) } as never,
    { setContext: jest.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const reserve = () =>
    (service as any).reserveDuePublication(
      new Date(rule.nextRunAt.getTime() - 120000),
    ) as Promise<SocialPublication | null>;
  return { rule, own, youtube, used, query, reserve };
}

describe('Publishing group reservation transaction', () => {
  it('reserves own, YouTube, own, then falls back without repeating used clips', async () => {
    const f = fixture();
    const results = [await f.reserve(), await f.reserve(), await f.reserve(), await f.reserve()];
    expect(results.map(p => p?.sourceGroup ?? null)).toEqual(['own', 'youtube', 'own', null]);
    expect(f.used.map(p => [p.shortContentJobId, p.youtubeAssetId, p.clipIndex])).toEqual([
      [17, null, 1],
      [null, 'a'.repeat(64), 1],
      [17, null, 2],
    ]);
    expect(f.query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(f.query.setOnLocked).toHaveBeenCalledWith('skip_locked');
    expect(f.used.every(p => p.status === SocialPublicationStatus.QUEUED)).toBe(true);
  });

  it('uses only the second group while own is empty and resumes the own turn later', async () => {
    const f = fixture();
    const original = [...f.own];
    f.own.length = 0;
    expect((await f.reserve())?.sourceGroup).toBe('youtube');
    expect(f.rule.groupCursor).toBe(0);
    f.own.push(...original);
    expect((await f.reserve())?.sourceGroup).toBe('own');
    expect(f.rule.groupCursor).toBe(1);
  });

  it('can strictly wait for a missing group and does not move the group cursor', async () => {
    const f = fixture();
    f.rule.fallbackToOtherGroup = false;
    f.own.length = 0;
    expect(await f.reserve()).toBeNull();
    expect(f.rule.groupCursor).toBe(0);
    expect(f.used).toEqual([]);
  });

  it('does not reserve a snapshot deleted between listing candidates and taking its lock', async () => {
    const f = fixture();
    f.own.length = 0;
    f.youtube[0].deletedAt = new Date();
    expect(await f.reserve()).toBeNull();
    expect(f.used).toEqual([]);
  });
});

describe('Approved YouTube publishing integration', () => {
  it('requires verified source ownership and explicit review before asking the worker for a snapshot', async () => {
    const asset = { id: 'a'.repeat(64), videoId: 'abcdefghijk', revision: 1 };
    const video = {
      videoId: asset.videoId,
      channelId: 'UC_test',
      isShort: true,
      lastSyncedAt: new Date(),
      title: 'Shorts',
      description: 'Описание',
    };
    const worker = {
      youtubeRequest: jest.fn().mockResolvedValue({ assetId: asset.id, revision: 1 }),
    };
    const clips = {
      upsert: jest.fn(),
      findOneBy: jest.fn().mockResolvedValue(null),
      findOneByOrFail: jest.fn().mockResolvedValue(asset),
    };
    const repositories = new Map<any, any>([
      [YoutubeVideo, { findOneBy: jest.fn().mockResolvedValue(video) }],
      [YoutubeSource, { exist: jest.fn().mockResolvedValue(true) }],
      [SocialYoutubeClip, clips],
    ]);
    const service = new SocialPublishingService(
      { getRepository: entity => repositories.get(entity) } as never,
      { setContext: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      worker as never,
    );
    await expect(service.enqueueYoutube(asset.videoId, { revision: 1 })).rejects.toThrow(
      'Подтвердите',
    );
    expect(worker.youtubeRequest).not.toHaveBeenCalled();
    await expect(
      service.enqueueYoutube(asset.videoId, { revision: 1, reviewConfirmed: true }),
    ).resolves.toEqual(asset);
    expect(worker.youtubeRequest).toHaveBeenCalledWith(
      'POST',
      asset.videoId,
      { revision: 1, reviewConfirmed: true },
      'publishing',
    );
    expect(clips.upsert).toHaveBeenCalledTimes(1);
    clips.findOneBy.mockResolvedValueOnce({ ...asset, deletedAt: new Date() });
    await expect(
      service.enqueueYoutube(asset.videoId, { revision: 1, reviewConfirmed: true }),
    ).rejects.toThrow('опубликована и удалена');
    expect(worker.youtubeRequest).toHaveBeenCalledTimes(1);
    video.isShort = false;
    await expect(
      service.enqueueYoutube(asset.videoId, { revision: 1, reviewConfirmed: true }),
    ).rejects.toThrow('канал');
    expect(worker.youtubeRequest).toHaveBeenCalledTimes(1);
  });

  it('uploads only the immutable signed export, reuses asynchronous uploads and schedules its metadata', async () => {
    const asset = {
      id: 'a'.repeat(64),
      videoId: 'abcdefghijk',
      revision: 1,
      title: 'Готовая версия',
      description: 'Авторское описание',
    };
    const rule = {
      id: 7,
      provider: SocialPublishingProvider.POSTMYPOST,
      projectId: 11,
      accountIds: [13],
      titleTemplate: '{sourceGroup}: {title}',
      captionTemplate: '{description}',
    };
    const publication = {
      id: 1,
      ruleId: 7,
      provider: rule.provider,
      sourceGroup: 'youtube',
      youtubeAssetId: asset.id,
      shortContentJobId: null,
      clipIndex: 1,
      status: SocialPublicationStatus.QUEUED,
      attempts: 0,
      scheduledAt: new Date('2030-01-01T10:00:00Z'),
    } as SocialPublication;
    const query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const ownJobs = { findOne: jest.fn() };
    const provider = {
      assertAccountsReady: jest.fn(),
      startVideoUpload: jest.fn().mockResolvedValue({ externalUploadId: 'upload-1', raw: {} }),
      scheduleUploadedVideo: jest
        .fn()
        .mockResolvedValue({ externalPublicationId: 'post-1', raw: {} }),
    };
    const worker = {
      youtubePublishingUrl: jest.fn().mockResolvedValue({
        url: 'https://shorts.example/publishing/youtube/snapshot.mp4?signature=test',
      }),
      deleteHighlightClip: jest.fn(),
    };
    const publications = {
      createQueryBuilder: () => query,
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([publication]),
    };
    const service = new SocialPublishingService(
      { getRepository: () => ({ findOneBy: jest.fn().mockResolvedValue(asset) }) } as never,
      { setContext: jest.fn() } as never,
      provider as never,
      {
        exists: jest.fn().mockResolvedValue(false),
        findOne: jest.fn().mockResolvedValue(rule),
        find: jest.fn().mockResolvedValue([]),
      } as never,
      publications as never,
      ownJobs as never,
      worker as never,
    );
    await (service as any).submit(publication);
    expect(publication.status).toBe(SocialPublicationStatus.PROCESSING);
    expect(worker.youtubePublishingUrl).toHaveBeenCalledWith(asset.id);
    expect(provider.startVideoUpload).toHaveBeenCalledWith({
      projectId: 11,
      videoUrl: 'https://shorts.example/publishing/youtube/snapshot.mp4?signature=test',
    });
    expect(ownJobs.findOne).not.toHaveBeenCalled();
    publication.externalFileId = 'file-1';
    await (service as any).submit(publication);
    expect(provider.startVideoUpload).toHaveBeenCalledTimes(1);
    expect(provider.scheduleUploadedVideo).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'YouTube: Готовая версия', caption: 'Авторское описание' }),
    );
    publication.status = SocialPublicationStatus.PUBLISHED;
    await (service as any).cleanupPublishedClips();
    expect(ownJobs.findOne).not.toHaveBeenCalled();
    expect(worker.deleteHighlightClip).not.toHaveBeenCalled();
  });
});
