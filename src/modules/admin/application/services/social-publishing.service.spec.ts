import { SocialPublishingService } from '@/admin/application/services/social-publishing.service';
import { ShortContentJobStatus, ShortContentType } from '@/admin/domain/short-content-job.entity';
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
      const scheduleVideo = jest.fn().mockResolvedValue({
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
        attempts: 0,
      } as SocialPublication;
      const ruleRepository = { findOne: jest.fn().mockResolvedValue(rule) };
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
        { scheduleVideo } as never,
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
      expect(scheduleVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Название из карточки — момент 1',
          caption: 'Название из карточки\nОписание из Кинопоиска',
        }),
      );
      expect(publication.status).toBe(SocialPublicationStatus.SCHEDULED);
    },
  );

  it('stores the title and description template when a rule has no custom caption', async () => {
    const ruleRepository = {
      create: jest.fn().mockImplementation(value => value),
      save: jest.fn().mockImplementation(value => Promise.resolve(value)),
    };
    const service = new SocialPublishingService(
      {} as never,
      { setContext: jest.fn() } as never,
      {} as never,
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
      timezone: 'Europe/Moscow',
    });

    expect(ruleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ captionTemplate: '{title}\n{description}' }),
    );
  });
});
