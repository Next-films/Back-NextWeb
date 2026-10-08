import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ShortContentJob, ShortContentJobStatus } from '@/admin/domain/short-content-job.entity';
import {
  SocialPublication,
  SocialPublicationStatus,
} from '@/admin/domain/social-publication.entity';
import {
  SocialPublishingProvider,
  SocialPublishingRule,
} from '@/admin/domain/social-publishing-rule.entity';
import { PostMyPostPublishingService } from '@/admin/application/services/postmypost-publishing.service';
import { SocialPublishingProviderAdapter } from '@/admin/application/services/social-publishing-provider';
import {
  AdminCreateSocialPublishingRuleInputDto,
  AdminUpdateSocialPublishingRuleInputDto,
} from '@/admin/api/dtos/input/admin-social-publishing.input.dto';
import {
  assertValidTimeZone,
  getFirstDailyRunAt,
  getNextDailyRunAt,
  normalizeDailyTimes,
} from '@/admin/application/services/social-publishing-schedule';

type StoredClip = {
  index: number;
  videoUrl?: string;
  downloadUrl?: string;
};

@Injectable()
export class SocialPublishingService {
  private isTickRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly postMyPost: PostMyPostPublishingService,
    @InjectRepository(SocialPublishingRule)
    private readonly ruleRepository: Repository<SocialPublishingRule>,
    @InjectRepository(SocialPublication)
    private readonly publicationRepository: Repository<SocialPublication>,
    @InjectRepository(ShortContentJob)
    private readonly shortContentJobRepository: Repository<ShortContentJob>,
  ) {
    this.logger.setContext(SocialPublishingService.name);
  }

  listRules(): Promise<SocialPublishingRule[]> {
    return this.ruleRepository.find({ order: { createdAt: 'DESC' } });
  }

  listPublications(): Promise<SocialPublication[]> {
    return this.publicationRepository.find({
      relations: { rule: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async createRule(input: AdminCreateSocialPublishingRuleInputDto): Promise<SocialPublishingRule> {
    const startAt = new Date(input.startAt);
    const timezone = input.timezone ?? 'Europe/Moscow';
    const dailyTimes = normalizeDailyTimes(input.dailyTimes);

    this.validateTimeZone(timezone);
    const rule = this.ruleRepository.create({
      name: input.name,
      provider: input.provider,
      projectId: input.projectId,
      accountIds: [...new Set(input.accountIds)],
      contentTypes: input.contentTypes ?? ['film', 'cartoon', 'serial'],
      intervalMinutes: input.intervalMinutes,
      dailyTimes,
      startAt,
      nextRunAt: dailyTimes ? getFirstDailyRunAt(startAt, dailyTimes, timezone) : startAt,
      timezone,
      titleTemplate: input.titleTemplate?.trim() || '{title} — момент {clipIndex}',
      captionTemplate: input.captionTemplate?.trim() || null,
      isEnabled: input.isEnabled ?? true,
    });

    return this.ruleRepository.save(rule);
  }

  async updateRule(
    id: number,
    input: AdminUpdateSocialPublishingRuleInputDto,
  ): Promise<SocialPublishingRule> {
    const rule = await this.getRuleOrThrow(id);

    if (input.name !== undefined) rule.name = input.name;
    if (input.provider !== undefined) rule.provider = input.provider;
    if (input.projectId !== undefined) rule.projectId = input.projectId;
    if (input.accountIds !== undefined) rule.accountIds = [...new Set(input.accountIds)];
    if (input.contentTypes !== undefined) rule.contentTypes = input.contentTypes;
    if (input.intervalMinutes !== undefined) rule.intervalMinutes = input.intervalMinutes;
    if (input.timezone !== undefined) rule.timezone = input.timezone;
    if (input.dailyTimes !== undefined) rule.dailyTimes = normalizeDailyTimes(input.dailyTimes);
    if (input.titleTemplate !== undefined) rule.titleTemplate = input.titleTemplate.trim() || null;
    if (input.captionTemplate !== undefined)
      rule.captionTemplate = input.captionTemplate.trim() || null;
    if (input.isEnabled !== undefined) rule.isEnabled = input.isEnabled;
    if (input.startAt !== undefined) rule.startAt = new Date(input.startAt);
    if (
      input.startAt !== undefined ||
      input.timezone !== undefined ||
      input.dailyTimes !== undefined
    ) {
      this.validateTimeZone(rule.timezone);
      rule.nextRunAt = rule.dailyTimes
        ? getFirstDailyRunAt(rule.startAt, rule.dailyTimes, rule.timezone)
        : rule.startAt;
    }

    return this.ruleRepository.save(rule);
  }

  async removeRule(id: number): Promise<void> {
    await this.ruleRepository.remove(await this.getRuleOrThrow(id));
  }

  async retryPublication(id: number): Promise<SocialPublication> {
    const publication = await this.publicationRepository.findOne({ where: { id } });

    if (!publication) throw new NotFoundException('Social publication not found');
    if (publication.status !== SocialPublicationStatus.FAILED) {
      throw new BadRequestException('Only failed social publications can be retried');
    }

    publication.status = SocialPublicationStatus.QUEUED;
    publication.errorMessage = null;
    publication.externalPublicationId = null;
    publication.providerPayload = null;
    return this.publicationRepository.save(publication);
  }

  getProvider(provider: SocialPublishingProvider): SocialPublishingProviderAdapter {
    if (provider === SocialPublishingProvider.POSTMYPOST) return this.postMyPost;
    throw new NotFoundException('Social publishing provider is not supported');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.isTickRunning) return;

    this.isTickRunning = true;
    try {
      await this.recoverInterruptedSubmissions();

      for (let index = 0; index < 20; index += 1) {
        const publication = await this.reserveDuePublication(new Date());

        if (!publication) break;
      }

      const queued = await this.publicationRepository.find({
        where: { status: SocialPublicationStatus.QUEUED },
        order: { createdAt: 'ASC' },
        take: 10,
      });
      for (const publication of queued) {
        await this.submit(publication);
      }

      await this.refreshScheduledPublications();
    } catch (error) {
      this.logger.error(
        `Social publishing tick failed: ${error instanceof Error ? error.message : String(error)}`,
        this.tick.name,
      );
    } finally {
      this.isTickRunning = false;
    }
  }

  private async reserveDuePublication(now: Date): Promise<SocialPublication | null> {
    return this.dataSource.transaction(async manager => {
      // Hand the job to the provider a little early so it can publish at the
      // configured time instead of a minute or two after it.
      const schedulingHorizon = new Date(now.getTime() + 10 * 60_000);
      const rule = await manager
        .getRepository(SocialPublishingRule)
        .createQueryBuilder('rule')
        .where('rule.isEnabled = true')
        .andWhere('rule.nextRunAt <= :schedulingHorizon', { schedulingHorizon })
        .orderBy('rule.nextRunAt', 'ASC')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getOne();

      if (!rule) return null;

      const scheduledAt = new Date(Math.max(rule.nextRunAt.getTime(), now.getTime() + 120_000));
      rule.nextRunAt = this.advanceAfter(rule, scheduledAt);
      await manager.save(rule);

      const jobs = await manager.getRepository(ShortContentJob).find({
        where: { status: ShortContentJobStatus.RENDERED },
        order: { createdAt: 'ASC', id: 'ASC' },
        take: 2_000,
      });
      const used = await manager.getRepository(SocialPublication).find({
        where: { ruleId: rule.id },
        select: { shortContentJobId: true, clipIndex: true },
      });
      const usedKeys = new Set(used.map(item => `${item.shortContentJobId}:${item.clipIndex}`));

      for (const job of jobs) {
        if (!rule.contentTypes.includes(job.contentType)) continue;

        const clips = this.getClips(job);
        for (const clip of clips) {
          if (usedKeys.has(`${job.id}:${clip.index}`)) continue;

          return manager.save(
            manager.getRepository(SocialPublication).create({
              ruleId: rule.id,
              shortContentJobId: job.id,
              clipIndex: clip.index,
              provider: rule.provider,
              status: SocialPublicationStatus.QUEUED,
              scheduledAt,
              externalPublicationId: null,
              providerPayload: null,
              errorMessage: null,
              attempts: 0,
            }),
          );
        }
      }

      return null;
    });
  }

  private async submit(publication: SocialPublication): Promise<void> {
    const claim = await this.publicationRepository
      .createQueryBuilder()
      .update(SocialPublication)
      .set({
        status: SocialPublicationStatus.SUBMITTING,
        attempts: () => '"attempts" + 1',
        errorMessage: null,
      })
      .where('id = :id', { id: publication.id })
      .andWhere('status = :status', { status: SocialPublicationStatus.QUEUED })
      .execute();

    if (claim.affected !== 1) return;

    publication.status = SocialPublicationStatus.SUBMITTING;
    publication.attempts += 1;
    publication.errorMessage = null;

    const [rule, job] = await Promise.all([
      this.ruleRepository.findOne({ where: { id: publication.ruleId } }),
      this.shortContentJobRepository.findOne({ where: { id: publication.shortContentJobId } }),
    ]);

    if (!rule || !job) {
      publication.status = SocialPublicationStatus.FAILED;
      publication.errorMessage = 'Publishing rule or short content job no longer exists';
      await this.publicationRepository.save(publication);
      return;
    }

    const clip = this.getClips(job).find(item => item.index === publication.clipIndex);
    const videoUrl = clip?.downloadUrl || clip?.videoUrl;

    if (!videoUrl) {
      publication.status = SocialPublicationStatus.FAILED;
      publication.errorMessage = 'Clip URL is missing';
      await this.publicationRepository.save(publication);
      return;
    }

    try {
      const values = {
        title: job.contentTitle || `Контент ${job.contentId}`,
        clipIndex: String(publication.clipIndex),
        contentType: job.contentType,
        contentId: String(job.contentId),
      };
      const result = await this.getProvider(rule.provider).scheduleVideo({
        projectId: rule.projectId,
        accountIds: rule.accountIds,
        videoUrl,
        scheduledAt: publication.scheduledAt,
        title: this.interpolate(rule.titleTemplate, values),
        caption: this.interpolate(rule.captionTemplate, values),
      });

      publication.status = SocialPublicationStatus.SCHEDULED;
      publication.externalPublicationId = result.externalPublicationId;
      publication.providerPayload = result.raw;
    } catch (error) {
      publication.status = SocialPublicationStatus.FAILED;
      publication.errorMessage = error instanceof Error ? error.message : String(error);
    }

    await this.publicationRepository.save(publication);
  }

  private async refreshScheduledPublications(): Promise<void> {
    const publications = await this.publicationRepository.find({
      where: {
        status: SocialPublicationStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(new Date()),
      },
      order: { scheduledAt: 'ASC' },
      take: 50,
    });

    for (const publication of publications) {
      if (!publication.externalPublicationId) continue;

      try {
        const result = await this.getProvider(publication.provider).getPublicationStatus(
          publication.externalPublicationId,
        );
        publication.providerPayload = result.raw;
        publication.status =
          result.status === 'published'
            ? SocialPublicationStatus.PUBLISHED
            : result.status === 'failed'
            ? SocialPublicationStatus.FAILED
            : SocialPublicationStatus.SCHEDULED;
        publication.errorMessage =
          result.status === 'failed' ? 'Provider reported publication error' : null;
        await this.publicationRepository.save(publication);
      } catch (error) {
        this.logger.warn(
          `Cannot refresh social publication ${publication.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          this.refreshScheduledPublications.name,
        );
      }
    }
  }

  private async recoverInterruptedSubmissions(): Promise<void> {
    const interruptedBefore = new Date(Date.now() - 10 * 60_000);

    await this.publicationRepository
      .createQueryBuilder()
      .update(SocialPublication)
      .set({
        status: SocialPublicationStatus.FAILED,
        errorMessage: 'Submission was interrupted; check the provider before retrying',
      })
      .where('status = :status', { status: SocialPublicationStatus.SUBMITTING })
      .andWhere('"updatedAt" < :interruptedBefore', { interruptedBefore })
      .execute();
  }

  private getClips(job: ShortContentJob): StoredClip[] {
    const clips = job.draftPayload?.clips;

    return Array.isArray(clips)
      ? clips.filter(
          (clip): clip is StoredClip =>
            typeof clip === 'object' &&
            clip !== null &&
            Number.isInteger((clip as StoredClip).index),
        )
      : [];
  }

  private interpolate(template: string | null, values: Record<string, string>): string | undefined {
    if (!template) return undefined;

    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, value),
      template,
    );
  }

  private advanceAfter(rule: SocialPublishingRule, after: Date): Date {
    if (rule.dailyTimes?.length) {
      return getNextDailyRunAt(after, rule.dailyTimes, rule.timezone);
    }

    const step = rule.intervalMinutes * 60_000;
    let next = rule.nextRunAt.getTime() + step;

    if (next <= after.getTime()) {
      next += Math.ceil((after.getTime() - next + 1) / step) * step;
    }

    return new Date(next);
  }

  private validateTimeZone(timeZone: string): void {
    try {
      assertValidTimeZone(timeZone);
    } catch {
      throw new BadRequestException(`Unsupported timezone: ${timeZone}`);
    }
  }

  private async getRuleOrThrow(id: number): Promise<SocialPublishingRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });

    if (!rule) throw new NotFoundException('Social publishing rule not found');
    return rule;
  }
}
