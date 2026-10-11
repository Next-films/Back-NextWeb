import { SocialPublishingService } from '@/admin/application/services/social-publishing.service';
import {
  ShortContentJob,
  ShortContentJobStatus,
  ShortContentType,
} from '@/admin/domain/short-content-job.entity';
import {
  SocialPublicationStatus,
  SocialPublication,
} from '@/admin/domain/social-publication.entity';
import {
  SocialPublishingProvider,
  SocialPublishingRule,
} from '@/admin/domain/social-publishing-rule.entity';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { Serial } from '@/serials/domain/serial.entity';

describe('SocialPublishingService', () => {
  const contentCases = [
    [ShortContentType.FILM, Film],
    [ShortContentType.CARTOON, Cartoon],
    [ShortContentType.SERIAL, Serial],
  ] as const;

  it.each(contentCases)(
    'uses the current %s title and description as the default caption',
    async (contentType, entity) => {
      const scheduleUploadedVideo = jest.fn().mockResolvedValue({
        externalPublicationId: 'publication-42',
        raw: { id: 42 },
      });
      const contentRepository = {
        findOne: jest.fn().mockResolvedValue({
          title: 'Название из карточки',
          description: 'Описание из Кинопоиска',
        }),
      };
      const dataSource = {
        getRepository: jest.fn().mockReturnValue(contentRepository),
      };
      const queryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const rule = {
        id: 7,
        provider: SocialPublishingProvider.POSTMYPOST,
        projectId: 11,
        accountIds: [13],
        titleTemplate: '{title} — момент {clipIndex}',
        captionTemplate: null,
      } as SocialPublishingRule;
      const job = {
        id: 17,
        contentType,
        contentId: 19,
        contentTitle: 'Старое название из нарезки',
        status: ShortContentJobStatus.RENDERED,
        draftPayload: {
          clips: [{ index: 1, downloadUrl: 'https://media.example/clip.mp4' }],
        },
      };
      const publication = {
        id: 23,
        ruleId: rule.id,
        shortContentJobId: job.id,
        clipIndex: 1,
        provider: rule.provider,
        status: SocialPublicationStatus.QUEUED,
        scheduledAt: new Date('2026-10-10T09:00:00.000Z'),
        externalFileId: '73',
        attempts: 0,
      } as SocialPublication;
      const ruleRepository = {
        exists: jest.fn().mockResolvedValue(false),
        findOne: jest.fn().mockResolvedValue(rule),
      };
      const publicationRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        save: jest.fn().mockImplementation(value => Promise.resolve(value)),
      };
      const shortContentJobRepository = { findOne: jest.fn().mockResolvedValue(job) };
      const logger = {
        setContext: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const service = new SocialPublishingService(
        dataSource as never,
        logger as never,
        {
          assertAccountsReady: jest.fn().mockResolvedValue(undefined),
          scheduleUploadedVideo,
        } as never,
        ruleRepository as never,
        publicationRepository as never,
        shortContentJobRepository as never,
      );

      await (service as unknown as { submit(value: SocialPublication): Promise<void> }).submit(
        publication,
      );

      expect(dataSource.getRepository).toHaveBeenCalledWith(entity);
      expect(contentRepository.findOne).toHaveBeenCalledWith({
        where: { id: job.contentId },
        select: { title: true, description: true },
      });
      expect(scheduleUploadedVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Название из карточки — момент 1',
          caption: 'Название из карточки\nОписание из Кинопоиска',
        }),
      );
      expect(publication.status).toBe(SocialPublicationStatus.SCHEDULED);
    },
  );

  it('persists an upload and reuses the file after asynchronous processing', async () => {
    const claimQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const rule = {
      id: 7,
      provider: SocialPublishingProvider.POSTMYPOST,
      projectId: 11,
      accountIds: [13],
      titleTemplate: '{title}',
      captionTemplate: null,
    } as SocialPublishingRule;
    const job = {
      id: 17,
      contentType: ShortContentType.FILM,
      contentId: 19,
      draftPayload: {
        clips: [{ index: 1, downloadUrl: 'https://media.example/clip.mp4' }],
      },
    } as unknown as ShortContentJob;
    const publication = {
      id: 23,
      ruleId: rule.id,
      shortContentJobId: job.id,
      clipIndex: 1,
      provider: rule.provider,
      status: SocialPublicationStatus.QUEUED,
      scheduledAt: new Date('2026-10-10T09:00:00.000Z'),
      externalUploadId: null,
      externalFileId: null,
      attempts: 0,
    } as SocialPublication;
    const publicationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(claimQuery),
      find: jest.fn().mockResolvedValue([publication]),
      save: jest.fn().mockImplementation(value => Promise.resolve(value)),
    };
    const startVideoUpload = jest.fn().mockResolvedValue({
      externalUploadId: 'upload-41',
      raw: { id: 41 },
    });
    const getVideoUploadStatus = jest
      .fn()
      .mockResolvedValueOnce({ status: 'processing', raw: { id: 41, status: 3 } })
      .mockResolvedValueOnce({
        status: 'ready',
        externalFileId: '73',
        raw: { id: 41, status: 1, file_id: 73 },
      });
    const scheduleUploadedVideo = jest.fn().mockResolvedValue({
      externalPublicationId: 'publication-99',
      raw: { id: 99 },
    });
    const provider = {
      assertAccountsReady: jest.fn().mockResolvedValue(undefined),
      startVideoUpload,
      getVideoUploadStatus,
      scheduleUploadedVideo,
    };
    const service = new SocialPublishingService(
      {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({ title: 'Фильм', description: 'Описание' }),
        }),
      } as never,
      { setContext: jest.fn(), warn: jest.fn() } as never,
      provider as never,
      {
        exists: jest.fn().mockResolvedValue(false),
        findOne: jest.fn().mockResolvedValue(rule),
      } as never,
      publicationRepository as never,
      { findOne: jest.fn().mockResolvedValue(job) } as never,
    );

    const privateService = service as unknown as {
      submit(value: SocialPublication): Promise<void>;
      refreshProcessingUploads(): Promise<void>;
    };

    await privateService.submit(publication);
    expect(publication.status).toBe(SocialPublicationStatus.PROCESSING);
    expect(publication.externalUploadId).toBe('upload-41');

    await privateService.refreshProcessingUploads();
    expect(publication.status).toBe(SocialPublicationStatus.PROCESSING);

    await privateService.refreshProcessingUploads();
    expect(publication.status).toBe(SocialPublicationStatus.QUEUED);
    expect(publication.externalFileId).toBe('73');

    await privateService.submit(publication);
    expect(publication.status).toBe(SocialPublicationStatus.SCHEDULED);
    expect(startVideoUpload).toHaveBeenCalledTimes(1);
    expect(scheduleUploadedVideo).toHaveBeenCalledTimes(1);
  });

  it('retries a failed publication immediately', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00.000Z'));

    try {
      const publication = {
        id: 23,
        status: SocialPublicationStatus.FAILED,
        scheduledAt: new Date('2026-10-11T09:00:00.000Z'),
        externalUploadId: '41',
        externalFileId: '73',
        externalPublicationId: '99',
        errorMessage: 'Previous error',
      } as SocialPublication;
      const publicationRepository = {
        findOne: jest.fn().mockResolvedValue(publication),
        save: jest.fn().mockImplementation(value => Promise.resolve(value)),
      };
      const ruleRepository = {
        exists: jest.fn().mockResolvedValueOnce(true).mockResolvedValue(false),
      };
      const service = new SocialPublishingService(
        {} as never,
        { setContext: jest.fn() } as never,
        {} as never,
        ruleRepository as never,
        publicationRepository as never,
        {} as never,
      );
      const resume = jest
        .spyOn(service, 'resumeAfterFailure')
        .mockResolvedValue({ resumedRules: 1 });
      const submit = jest
        .spyOn(service as unknown as { submit(value: SocialPublication): Promise<void> }, 'submit')
        .mockResolvedValue(undefined);

      const retried = await service.retryPublication(publication.id);

      expect(retried.status).toBe(SocialPublicationStatus.QUEUED);
      expect(retried.scheduledAt).toEqual(new Date('2026-10-11T12:00:00.000Z'));
      expect(retried.externalPublicationId).toBeNull();
      expect(resume).toHaveBeenCalledTimes(1);
      expect(submit).toHaveBeenCalledWith(publication);
    } finally {
      jest.useRealTimers();
    }
  });

  it('moves a scheduled PostMyPost publication to the current time', async () => {
    const publication = {
      id: 23,
      ruleId: 7,
      provider: SocialPublishingProvider.POSTMYPOST,
      status: SocialPublicationStatus.SCHEDULED,
      scheduledAt: new Date('2026-10-11T09:00:00.000Z'),
      externalPublicationId: '99',
    } as SocialPublication;
    const rule = {
      id: 7,
      provider: SocialPublishingProvider.POSTMYPOST,
      projectId: 5,
      accountIds: [10, 11],
    } as SocialPublishingRule;
    const scheduledAt = new Date('2026-10-11T12:00:10.000Z');
    const provider = {
      assertAccountsReady: jest.fn().mockResolvedValue(undefined),
      publishNow: jest.fn().mockResolvedValue({
        status: 'scheduled',
        scheduledAt,
        raw: { id: 99, publication_status: 5 },
      }),
    };
    const publicationRepository = {
      findOne: jest.fn().mockResolvedValue(publication),
      save: jest.fn().mockImplementation(value => Promise.resolve(value)),
    };
    const service = new SocialPublishingService(
      {} as never,
      { setContext: jest.fn() } as never,
      provider as never,
      {
        exists: jest.fn().mockResolvedValue(false),
        findOne: jest.fn().mockResolvedValue(rule),
      } as never,
      publicationRepository as never,
      {} as never,
    );

    const updated = await service.publishPublicationNow(publication.id);

    expect(provider.assertAccountsReady).toHaveBeenCalledWith(5, [10, 11]);
    expect(provider.publishNow).toHaveBeenCalledWith('99');
    expect(updated.scheduledAt).toEqual(scheduledAt);
    expect(updated.status).toBe(SocialPublicationStatus.SCHEDULED);
  });

  it('pauses every active rule when a publication fails', async () => {
    const claimQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const pauseQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const rule = {
      id: 7,
      provider: SocialPublishingProvider.POSTMYPOST,
      projectId: 11,
      accountIds: [13, 14],
      titleTemplate: null,
      captionTemplate: null,
    } as SocialPublishingRule;
    const job = {
      id: 17,
      contentType: ShortContentType.FILM,
      contentId: 19,
      draftPayload: {
        clips: [{ index: 1, downloadUrl: 'https://media.example/clip.mp4' }],
      },
    } as unknown as ShortContentJob;
    const publication = {
      id: 23,
      ruleId: rule.id,
      shortContentJobId: 17,
      clipIndex: 1,
      provider: rule.provider,
      status: SocialPublicationStatus.QUEUED,
      scheduledAt: new Date('2026-10-10T09:00:00.000Z'),
      externalFileId: '73',
      attempts: 0,
    } as SocialPublication;
    const ruleRepository = {
      exists: jest.fn().mockResolvedValue(false),
      findOne: jest.fn().mockResolvedValue(rule),
      createQueryBuilder: jest.fn().mockReturnValue(pauseQuery),
    };
    const publicationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(claimQuery),
      save: jest.fn().mockImplementation(value => Promise.resolve(value)),
    };
    const logger = { setContext: jest.fn(), warn: jest.fn() };
    const service = new SocialPublishingService(
      {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({ title: 'Фильм', description: 'Описание' }),
        }),
      } as never,
      logger as never,
      {
        assertAccountsReady: jest.fn().mockResolvedValue(undefined),
        scheduleUploadedVideo: jest
          .fn()
          .mockRejectedValue(new Error('PostMyPost publication rejected')),
      } as never,
      ruleRepository as never,
      publicationRepository as never,
      { findOne: jest.fn().mockResolvedValue(job) } as never,
    );

    await (service as unknown as { submit(value: SocialPublication): Promise<void> }).submit(
      publication,
    );

    expect(publication.status).toBe(SocialPublicationStatus.FAILED);
    expect(pauseQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false, pausedByFailure: true }),
    );
    expect(pauseQuery.where).toHaveBeenCalledWith('"isEnabled" = true OR "pausedByFailure" = true');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('PostMyPost publication rejected'),
      'pauseAllPublishing',
    );
  });

  it('stores the title and description template when a rule has no custom caption', async () => {
    const ruleRepository = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation(value => value),
      save: jest.fn().mockImplementation(value => Promise.resolve(value)),
    };
    const service = new SocialPublishingService(
      {} as never,
      { setContext: jest.fn() } as never,
      { assertAccountsReady: jest.fn().mockResolvedValue(undefined) } as never,
      ruleRepository as never,
      {} as never,
      {} as never,
    );

    await service.createRule({
      name: 'Основной автопостинг',
      provider: SocialPublishingProvider.POSTMYPOST,
      projectId: 5,
      accountIds: [10],
      contentTypes: [ShortContentType.FILM],
      intervalMinutes: 60,
      startAt: '2026-10-10T09:00:00.000Z',
      endAt: '2026-10-31T21:00:00.000Z',
      timezone: 'Europe/Moscow',
    });

    expect(ruleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        captionTemplate: '{title}\n{description}',
        endAt: new Date('2026-10-31T21:00:00.000Z'),
      }),
    );
  });

  it('rejects an end date earlier than the first publication', async () => {
    const ruleRepository = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new SocialPublishingService(
      {} as never,
      { setContext: jest.fn() } as never,
      { assertAccountsReady: jest.fn().mockResolvedValue(undefined) } as never,
      ruleRepository as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createRule({
        name: 'Ограниченный автопостинг',
        provider: SocialPublishingProvider.POSTMYPOST,
        projectId: 5,
        accountIds: [10],
        contentTypes: [ShortContentType.FILM],
        intervalMinutes: 60,
        startAt: '2026-10-10T09:00:00.000Z',
        endAt: '2026-10-10T08:00:00.000Z',
        timezone: 'Europe/Moscow',
      }),
    ).rejects.toThrow('Publishing end must not be earlier than its start');
    expect(ruleRepository.create).not.toHaveBeenCalled();
  });

  it('recalculates the next publication when the interval is edited', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T08:30:00.000Z'));

    try {
      const rule = {
        id: 7,
        name: 'Основной автопостинг',
        provider: SocialPublishingProvider.POSTMYPOST,
        projectId: 11,
        accountIds: [13],
        contentTypes: [ShortContentType.FILM],
        intervalMinutes: 6 * 60,
        dailyTimes: null,
        startAt: new Date('2026-10-10T00:00:00.000Z'),
        nextRunAt: new Date('2026-10-11T12:00:00.000Z'),
        endAt: null,
        timezone: 'Europe/Moscow',
        isEnabled: true,
      } as SocialPublishingRule;
      const ruleRepository = {
        findOne: jest.fn().mockResolvedValue(rule),
        save: jest.fn().mockImplementation(value => Promise.resolve(value)),
      };
      const service = new SocialPublishingService(
        {} as never,
        { setContext: jest.fn() } as never,
        { assertAccountsReady: jest.fn().mockResolvedValue(undefined) } as never,
        ruleRepository as never,
        {} as never,
        {} as never,
      );

      const updated = await service.updateRule(rule.id, { intervalMinutes: 3 * 60 });

      expect(updated.intervalMinutes).toBe(3 * 60);
      expect(updated.nextRunAt).toEqual(new Date('2026-10-11T09:00:00.000Z'));
      expect(ruleRepository.save).toHaveBeenCalledWith(rule);
    } finally {
      jest.useRealTimers();
    }
  });

  it('disables a rule after reserving its last allowed publication', async () => {
    const rule = {
      id: 7,
      provider: SocialPublishingProvider.POSTMYPOST,
      projectId: 11,
      accountIds: [13],
      contentTypes: [ShortContentType.FILM],
      intervalMinutes: 60,
      dailyTimes: null,
      startAt: new Date('2026-10-10T09:00:00.000Z'),
      nextRunAt: new Date('2026-10-10T10:00:00.000Z'),
      endAt: new Date('2026-10-10T10:00:00.000Z'),
      timezone: 'Europe/Moscow',
      isEnabled: true,
    } as SocialPublishingRule;
    const job = {
      id: 17,
      contentType: ShortContentType.FILM,
      contentId: 19,
      status: ShortContentJobStatus.RENDERED,
      draftPayload: {
        clips: [{ index: 1, downloadUrl: 'https://media.example/clip.mp4' }],
      },
    };
    const ruleQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(rule),
    };
    const dueRuleRepository = { createQueryBuilder: jest.fn().mockReturnValue(ruleQuery) };
    const shortContentRepository = { find: jest.fn().mockResolvedValue([job]) };
    const publicationRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(value => value),
    };
    const manager = {
      getRepository: jest.fn().mockImplementation(entity => {
        if (entity === SocialPublishingRule) return dueRuleRepository;
        if (entity === SocialPublication) return publicationRepository;
        return shortContentRepository;
      }),
      save: jest.fn().mockImplementation(value => Promise.resolve(value)),
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(callback => callback(manager)),
    };
    const service = new SocialPublishingService(
      dataSource as never,
      { setContext: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const publication = await (
      service as unknown as { reserveDuePublication(now: Date): Promise<SocialPublication | null> }
    ).reserveDuePublication(new Date('2026-10-10T09:58:00.000Z'));

    expect(publication?.scheduledAt).toEqual(new Date('2026-10-10T10:00:00.000Z'));
    expect(rule.nextRunAt).toEqual(new Date('2026-10-10T11:00:00.000Z'));
    expect(rule.isEnabled).toBe(false);
  });
});
