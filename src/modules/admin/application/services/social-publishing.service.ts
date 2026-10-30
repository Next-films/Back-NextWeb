import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ShortContentJob,
  ShortContentJobStatus,
  ShortContentType,
} from '@/admin/domain/short-content-job.entity';
import {
  SocialPublication,
  SocialPublicationStatus,
} from '@/admin/domain/social-publication.entity';
import {
  SocialPublishingProvider,
  SocialPublishingRule,
} from '@/admin/domain/social-publishing-rule.entity';
import { PostMyPostPublishingService } from '@/admin/application/services/postmypost-publishing.service';
import { ShortContentClientService } from '@/admin/application/services/short-content-client.service';
import {
  SocialProviderAccountsNotReadyError,
  SocialPublishingProviderAdapter,
} from '@/admin/application/services/social-publishing-provider';
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
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { Serial } from '@/serials/domain/serial.entity';
import { SocialYoutubeClip } from '@/admin/domain/social-youtube-clip.entity';
import { YoutubeVideo } from '@/admin/domain/youtube-video.entity';
import { YoutubeSource } from '@/admin/domain/youtube-source.entity';
import { isYoutubeVideoId } from './youtube-source';
import { selectPublishingGroup } from './social-publishing-groups';

type StoredClip = {
  index: number;
  videoUrl?: string;
  downloadUrl?: string;
  hook?: string;
};

const DEFAULT_TITLE_TEMPLATE = '{hook}';
const DEFAULT_CAPTION_TEMPLATE = '{hook}\n\n{title}\n#кино #shorts';
const IMMEDIATE_PUBLICATION_DELAY_MS = 2 * 60_000;
const STUCK_PUBLICATION_GRACE_MS = 5 * 60_000;
const INTERRUPTED_SUBMISSION_ERROR =
  'Submission was interrupted; check the provider before retrying';
const INTERRUPTED_SUBMISSION_PAUSE_FRAGMENT = 'publication submission(s) were interrupted';

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
    private readonly shortContentClient: ShortContentClientService,
  ) {
    this.logger.setContext(SocialPublishingService.name);
  }

  listRules(): Promise<SocialPublishingRule[]> {
    return this.ruleRepository.find({ order: { createdAt: 'DESC' } });
  }

  listYoutubeClips(): Promise<SocialYoutubeClip[]> {
    return this.dataSource
      .getRepository(SocialYoutubeClip)
      .find({ where: { deletedAt: IsNull() }, order: { createdAt: 'DESC' }, take: 200 });
  }

  async enqueueYoutube(videoId: string, input: unknown): Promise<SocialYoutubeClip> {
    const body = input as { revision?: unknown; reviewConfirmed?: unknown } | null;
    if (
      !isYoutubeVideoId(videoId) ||
      body?.reviewConfirmed !== true ||
      !Number.isInteger(body.revision) ||
      Number(body.revision) < 1
    )
      throw new BadRequestException('Подтвердите проверку готовой версии Shorts');
    const video = await this.dataSource.getRepository(YoutubeVideo).findOneBy({ videoId });
    if (
      !video ||
      video.isShort !== true ||
      !video.lastSyncedAt ||
      !(await this.dataSource
        .getRepository(YoutubeSource)
        .exist({ where: { channelId: video.channelId, enabled: true } }))
    )
      throw new BadRequestException('Shorts или добавленный канал недоступен');
    const repository = this.dataSource.getRepository(SocialYoutubeClip);
    const previous = await repository.findOneBy({ videoId, revision: Number(body.revision) });
    if (previous?.deletedAt)
      throw new BadRequestException('Эта версия уже опубликована и удалена из хранилища');
    const result = await this.shortContentClient.youtubeRequest(
      'POST',
      videoId,
      {
        revision: body.revision,
        reviewConfirmed: true,
      },
      'publishing',
    );
    if (
      typeof result.assetId !== 'string' ||
      !/^[a-f0-9]{64}$/.test(result.assetId) ||
      result.revision !== body.revision
    )
      throw new BadRequestException('Обработанная версия недоступна');
    await repository.upsert(
      {
        id: result.assetId,
        videoId,
        revision: Number(body.revision),
        title: video.title,
        description: video.description,
      },
      ['videoId', 'revision'],
    );
    const asset = await repository.findOneByOrFail({ id: result.assetId });
    if (asset.deletedAt)
      throw new BadRequestException('Эта версия уже опубликована и удалена из хранилища');
    return asset;
  }

  async listPublications(): Promise<SocialPublication[]> {
    const publications = await this.publicationRepository.find({
      relations: { rule: true, youtubeClip: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return publications.map(publication => {
      if (
        publication.status === SocialPublicationStatus.FAILED &&
        publication.providerPayload &&
        publication.errorMessage?.startsWith('PostMyPost reported an error')
      ) {
        const reason = this.postMyPost.getPublicationFailureReason(publication.providerPayload);
        if (reason) publication.errorMessage = this.providerFailureMessage(publication, reason);
      }
      return publication;
    });
  }

  listPublicationMarks(): Promise<SocialPublication[]> {
    return this.publicationRepository.find({
      select: {
        id: true,
        ruleId: true,
        shortContentJobId: true,
        sourceGroup: true,
        youtubeAssetId: true,
        clipIndex: true,
        status: true,
        scheduledAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { createdAt: 'DESC' },
      take: 10_000,
    });
  }

  async createRule(input: AdminCreateSocialPublishingRuleInputDto): Promise<SocialPublishingRule> {
    const startAt = new Date(input.startAt);
    const endAt = input.endAt ? new Date(input.endAt) : null;
    const timezone = input.timezone ?? 'Europe/Moscow';
    const dailyTimes = normalizeDailyTimes(input.dailyTimes);

    this.validateTimeZone(timezone);
    this.validateEndAt(startAt, endAt);
    const nextRunAt = dailyTimes ? getFirstDailyRunAt(startAt, dailyTimes, timezone) : startAt;

    if (endAt && nextRunAt > endAt) {
      throw new BadRequestException('Publishing end must not be earlier than first publication');
    }

    if (input.isEnabled ?? true) {
      await this.assertPublishingCanStart();
      await this.getProvider(input.provider).assertAccountsReady(input.projectId, input.accountIds);
    }

    const rule = this.ruleRepository.create({
      sourceGroups: input.sourceGroups ?? ['own'],
      groupStrategy: input.groupStrategy ?? 'alternate',
      firstGroup: input.firstGroup ?? 'own',
      ownPerCycle: input.ownPerCycle ?? 1,
      youtubePerCycle: input.youtubePerCycle ?? 1,
      fallbackToOtherGroup: input.fallbackToOtherGroup ?? true,
      groupCursor: 0,
      name: input.name,
      provider: input.provider,
      projectId: input.projectId,
      accountIds: [...new Set(input.accountIds)],
      contentTypes: input.contentTypes ?? ['film', 'cartoon', 'serial'],
      intervalMinutes: input.intervalMinutes,
      dailyTimes,
      startAt,
      endAt,
      nextRunAt,
      timezone,
      titleTemplate: input.titleTemplate?.trim() || DEFAULT_TITLE_TEMPLATE,
      captionTemplate: input.captionTemplate?.trim() || DEFAULT_CAPTION_TEMPLATE,
      isEnabled: input.isEnabled ?? true,
      pausedByFailure: false,
      pausedAt: null,
      pauseReason: null,
    });

    return this.ruleRepository.save(rule);
  }

  async updateRule(
    id: number,
    input: AdminUpdateSocialPublishingRuleInputDto,
  ): Promise<SocialPublishingRule> {
    const rule = await this.getRuleOrThrow(id);
    const groupFields = [
      'sourceGroups',
      'groupStrategy',
      'firstGroup',
      'ownPerCycle',
      'youtubePerCycle',
      'fallbackToOtherGroup',
    ] as const;
    for (const field of groupFields) {
      if (
        input[field] !== undefined &&
        JSON.stringify(input[field]) !== JSON.stringify(rule[field])
      ) {
        Object.assign(rule, { [field]: input[field] });
        rule.groupCursor = 0;
      }
    }
    const scheduleChanged =
      input.startAt !== undefined ||
      input.intervalMinutes !== undefined ||
      input.timezone !== undefined ||
      input.dailyTimes !== undefined;

    if (input.isEnabled === true) await this.assertPublishingCanStart();

    if (input.name !== undefined) rule.name = input.name;
    if (input.provider !== undefined) rule.provider = input.provider;
    if (input.projectId !== undefined) rule.projectId = input.projectId;
    if (input.accountIds !== undefined) rule.accountIds = [...new Set(input.accountIds)];
    if (input.contentTypes !== undefined) rule.contentTypes = input.contentTypes;
    if (input.intervalMinutes !== undefined) rule.intervalMinutes = input.intervalMinutes;
    if (input.timezone !== undefined) rule.timezone = input.timezone;
    if (input.dailyTimes !== undefined) rule.dailyTimes = normalizeDailyTimes(input.dailyTimes);
    if (input.endAt !== undefined) rule.endAt = input.endAt ? new Date(input.endAt) : null;
    if (input.titleTemplate !== undefined) rule.titleTemplate = input.titleTemplate.trim() || null;
    if (input.captionTemplate !== undefined)
      rule.captionTemplate = input.captionTemplate.trim() || null;
    if (input.isEnabled !== undefined) {
      rule.isEnabled = input.isEnabled;
      if (!input.isEnabled) {
        rule.pausedByFailure = false;
        rule.pausedAt = null;
        rule.pauseReason = null;
      }
    }
    if (input.startAt !== undefined) rule.startAt = new Date(input.startAt);
    if (scheduleChanged) {
      this.validateTimeZone(rule.timezone);
      rule.nextRunAt = this.getNextRunAfterScheduleChange(rule, new Date());
    } else if (input.isEnabled === true && rule.nextRunAt < new Date()) {
      rule.nextRunAt = this.getNextRunAfterScheduleChange(rule, new Date());
    }
    this.validateEndAt(rule.startAt, rule.endAt);
    if (rule.endAt && rule.nextRunAt > rule.endAt) rule.isEnabled = false;

    if (rule.isEnabled) {
      await this.getProvider(rule.provider).assertAccountsReady(rule.projectId, rule.accountIds);
    }

    return this.ruleRepository.save(rule);
  }

  async resumeAfterFailure(): Promise<{ resumedRules: number }> {
    const now = new Date();
    const pausedRules = await this.ruleRepository.find({
      where: { pausedByFailure: true },
      order: { id: 'ASC' },
    });

    for (const rule of pausedRules) {
      if (rule.endAt && rule.endAt < now) continue;
      await this.getProvider(rule.provider).assertAccountsReady(rule.projectId, rule.accountIds);
    }

    const resumed = await this.ruleRepository
      .createQueryBuilder()
      .update(SocialPublishingRule)
      .set({
        isEnabled: true,
        pausedByFailure: false,
        pausedAt: null,
        pauseReason: null,
      })
      .where('"pausedByFailure" = true')
      .andWhere('( "endAt" IS NULL OR "endAt" >= :now )', { now })
      .execute();

    await this.ruleRepository
      .createQueryBuilder()
      .update(SocialPublishingRule)
      .set({ pausedByFailure: false, pausedAt: null, pauseReason: null })
      .where('"pausedByFailure" = true')
      .execute();

    return { resumedRules: resumed.affected ?? 0 };
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

    const claim = await this.publicationRepository
      .createQueryBuilder()
      .update(SocialPublication)
      .set({
        status: SocialPublicationStatus.SUBMITTING,
        errorMessage: null,
        externalPublicationId: null,
        scheduledAt: new Date(),
      })
      .where('id = :id', { id })
      .andWhere('status = :status', { status: SocialPublicationStatus.FAILED })
      .execute();

    if (claim.affected !== 1) {
      throw new BadRequestException('Social publication retry is already running');
    }

    publication.status = SocialPublicationStatus.SUBMITTING;
    publication.errorMessage = null;
    publication.externalPublicationId = null;
    publication.scheduledAt = new Date();
    void this.executePublicationRetry(id);

    return publication;
  }

  async publishPublicationNow(id: number): Promise<SocialPublication> {
    const publication = await this.publicationRepository.findOne({ where: { id } });
    if (!publication) throw new NotFoundException('Social publication not found');
    if (publication.status === SocialPublicationStatus.FAILED) {
      return this.retryPublication(id);
    }
    if (publication.status !== SocialPublicationStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled or failed publications can be published now');
    }
    if (!publication.externalPublicationId) {
      throw new BadRequestException('PostMyPost publication id is missing');
    }

    const scheduledAt = new Date(Date.now() + IMMEDIATE_PUBLICATION_DELAY_MS);
    const claim = await this.publicationRepository
      .createQueryBuilder()
      .update(SocialPublication)
      .set({
        status: SocialPublicationStatus.SUBMITTING,
        errorMessage: null,
        scheduledAt,
      })
      .where('id = :id', { id })
      .andWhere('status = :status', { status: SocialPublicationStatus.SCHEDULED })
      .execute();

    if (claim.affected !== 1) {
      throw new BadRequestException('Immediate publication is already running');
    }

    publication.status = SocialPublicationStatus.SUBMITTING;
    publication.errorMessage = null;
    publication.scheduledAt = scheduledAt;
    void this.executePublicationNow(id);

    return publication;
  }

  private async executePublicationRetry(id: number): Promise<void> {
    try {
      if (await this.isGloballyPaused()) await this.resumeAfterFailure();
      await this.assertPublishingCanStart();

      const publication = await this.publicationRepository.findOne({ where: { id } });
      if (!publication || publication.status !== SocialPublicationStatus.SUBMITTING) return;

      publication.status =
        publication.externalUploadId && !publication.externalFileId
          ? SocialPublicationStatus.PROCESSING
          : SocialPublicationStatus.QUEUED;
      publication.errorMessage = null;
      publication.externalPublicationId = null;
      publication.scheduledAt = new Date();
      await this.publicationRepository.save(publication);

      if (publication.status === SocialPublicationStatus.QUEUED) {
        await this.submit(publication);
      }
    } catch (error) {
      await this.failPendingPublication(id, this.getErrorMessage(error));
    }
  }

  private async executePublicationNow(id: number): Promise<void> {
    try {
      if (await this.isGloballyPaused()) await this.resumeAfterFailure();
      await this.assertPublishingCanStart();

      const publication = await this.publicationRepository.findOne({ where: { id } });
      if (!publication || publication.status !== SocialPublicationStatus.SUBMITTING) return;
      if (!publication.externalPublicationId) {
        await this.failAndPause(publication, 'PostMyPost publication id is missing');
        return;
      }

      const rule = await this.ruleRepository.findOne({ where: { id: publication.ruleId } });
      if (!rule) {
        await this.failAndPause(publication, 'Publishing rule no longer exists');
        return;
      }

      await this.getProvider(rule.provider).assertAccountsReady(rule.projectId, rule.accountIds);
      const result = await this.getProvider(publication.provider).publishNow(
        publication.externalPublicationId,
      );
      publication.providerPayload = result.raw;
      publication.errorMessage = null;

      if (result.status === 'published') {
        publication.status = SocialPublicationStatus.PUBLISHED;
      } else if (result.status === 'failed') {
        await this.failAndPause(
          publication,
          this.providerFailureMessage(publication, result.failureReason),
        );
        return;
      } else {
        publication.status = SocialPublicationStatus.SUBMITTING;
        publication.scheduledAt = result.scheduledAt ?? new Date();
      }

      await this.publicationRepository.save(publication);
    } catch (error) {
      await this.failPendingPublication(id, this.getErrorMessage(error));
    }
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
      await this.disableExpiredRules(new Date());
      const reconciledInterrupted = await this.reconcileInterruptedPublications();
      const interrupted = await this.recoverInterruptedSubmissions();
      if (interrupted > 0) {
        await this.pauseAllPublishing(
          `${interrupted} publication submission(s) were interrupted; check PostMyPost before resuming`,
        );
      }

      await this.refreshProcessingUploads();

      if (!(await this.isGloballyPaused())) {
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
          if (await this.isGloballyPaused()) break;
          await this.submit(publication);
        }
      }

      await this.refreshScheduledPublications();
      if (reconciledInterrupted > 0) {
        await this.resumeAfterReconciledInterruptions();
      }
      await this.cleanupPublishedClips();
      await this.cleanupPublishedYoutubeClips();
    } catch (error) {
      const reason = this.getErrorMessage(error);
      this.logger.error(`Social publishing tick failed: ${reason}`, this.tick.name);
      try {
        await this.pauseAllPublishing(`Social publishing worker failed: ${reason}`);
      } catch (pauseError) {
        this.logger.error(
          `Cannot pause social publishing after worker failure: ${this.getErrorMessage(
            pauseError,
          )}`,
          this.tick.name,
        );
      }
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
        .andWhere('(rule.endAt IS NULL OR rule.endAt >= :minimumScheduledAt)', {
          minimumScheduledAt: new Date(now.getTime() + 120_000),
        })
        .andWhere('(rule.endAt IS NULL OR rule.nextRunAt <= rule.endAt)')
        .orderBy('rule.nextRunAt', 'ASC')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getOne();

      if (!rule) return null;

      const scheduledAt = new Date(Math.max(rule.nextRunAt.getTime(), now.getTime() + 120_000));
      rule.nextRunAt = this.advanceAfter(rule, scheduledAt);
      if (rule.endAt && rule.nextRunAt > rule.endAt) rule.isEnabled = false;
      await manager.save(rule);

      const used = await manager.getRepository(SocialPublication).find({
        where: { ruleId: rule.id },
        select: { shortContentJobId: true, clipIndex: true, youtubeAssetId: true },
      });
      const usedKeys = new Set(used.map(item => `${item.shortContentJobId}:${item.clipIndex}`));

      let own: { job: ShortContentJob; clip: StoredClip } | null = null;
      const batchSize = 2000;
      if ((rule.sourceGroups ?? ['own']).includes('own')) {
        for (let offset = 0; !own; offset += batchSize) {
          const jobs = await manager.getRepository(ShortContentJob).find({
            where: { status: ShortContentJobStatus.RENDERED },
            order: { createdAt: 'ASC', id: 'ASC' },
            skip: offset,
            take: batchSize,
          });
          for (const job of jobs) {
            if (!rule.contentTypes.includes(job.contentType)) continue;
            for (const clip of this.getClips(job)) {
              if (usedKeys.has(`${job.id}:${clip.index}`)) continue;
              own = { job, clip };
              break;
            }
            if (own) break;
          }
          if (jobs.length < batchSize) break;
        }
      }
      const usedYoutube = new Set(used.map(item => item.youtubeAssetId).filter(Boolean));
      let youtube: SocialYoutubeClip | null = null;
      if (rule.sourceGroups?.includes('youtube')) {
        const repository = manager.getRepository(SocialYoutubeClip);
        const candidates = await repository.find({
          where: { deletedAt: IsNull() },
          order: { createdAt: 'ASC', id: 'ASC' },
        });
        for (const candidate of candidates) {
          if (usedYoutube.has(candidate.id)) continue;
          // Cleanup takes the same row lock; no publication can reserve a deleted file.
          youtube = await repository.findOne({
            where: { id: candidate.id, deletedAt: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          if (youtube) break;
        }
      }
      const selection = selectPublishingGroup(rule, { own: !!own, youtube: !!youtube });
      if (!selection) return null;
      rule.groupCursor = selection.nextCursor;
      await manager.save(rule);
      return manager.save(
        manager.getRepository(SocialPublication).create({
          ruleId: rule.id,
          sourceGroup: selection.group,
          shortContentJobId: selection.group === 'own' ? own!.job.id : null,
          clipIndex: selection.group === 'own' ? own!.clip.index : 1,
          youtubeAssetId: selection.group === 'youtube' ? youtube!.id : null,
          provider: rule.provider,
          status: SocialPublicationStatus.QUEUED,
          scheduledAt,
          externalPublicationId: null,
          externalUploadId: null,
          externalFileId: null,
          providerPayload: null,
          errorMessage: null,
          attempts: 0,
        }),
      );
    });
  }

  private async submit(publication: SocialPublication): Promise<void> {
    if (await this.isGloballyPaused()) return;

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
      publication.sourceGroup === 'youtube'
        ? Promise.resolve(null)
        : this.shortContentJobRepository.findOne({ where: { id: publication.shortContentJobId! } }),
    ]);

    if (!rule || (!job && publication.sourceGroup !== 'youtube')) {
      await this.failAndPause(publication, 'Publishing rule or short content job no longer exists');
      return;
    }

    if (!(await this.checkAccountsBeforePublishing(publication, rule))) return;

    try {
      const provider = this.getProvider(rule.provider);
      if (publication.sourceGroup === 'youtube') {
        await this.submitYoutube(publication, rule);
        await this.publicationRepository.save(publication);
        return;
      }
      if (!job) throw new Error('Short content job is missing');
      const clip = this.getClips(job).find(item => item.index === publication.clipIndex);

      if (publication.externalFileId) {
        const content = await this.getContentMetadata(job);
        const hook = clip?.hook?.trim() || `${content.title} — сцена ${publication.clipIndex}`;
        const values = {
          title: content.title,
          description: content.description,
          hook,
          clipIndex: String(publication.clipIndex),
          contentType: job.contentType,
          contentId: String(job.contentId),
          sourceGroup: 'Наше',
        };
        publication.scheduledAt = new Date(
          Math.max(publication.scheduledAt.getTime(), Date.now() + IMMEDIATE_PUBLICATION_DELAY_MS),
        );
        const result = await provider.scheduleUploadedVideo({
          projectId: rule.projectId,
          accountIds: rule.accountIds,
          externalFileId: publication.externalFileId,
          scheduledAt: publication.scheduledAt,
          title: this.interpolate(rule.titleTemplate, values),
          caption: this.interpolate(
            rule.captionTemplate || DEFAULT_CAPTION_TEMPLATE,
            values,
          )?.trim(),
        });

        publication.status = SocialPublicationStatus.SCHEDULED;
        publication.externalPublicationId = result.externalPublicationId;
        publication.providerPayload = result.raw;
      } else if (publication.externalUploadId) {
        publication.status = SocialPublicationStatus.PROCESSING;
      } else {
        const videoUrl = clip?.downloadUrl || clip?.videoUrl;

        if (!videoUrl) {
          await this.failAndPause(publication, 'Clip URL is missing');
          return;
        }

        const upload = await provider.startVideoUpload({
          projectId: rule.projectId,
          videoUrl,
        });
        publication.status = SocialPublicationStatus.PROCESSING;
        publication.externalUploadId = upload.externalUploadId;
        publication.providerPayload = upload.raw;
      }
    } catch (error) {
      publication.status = SocialPublicationStatus.FAILED;
      publication.errorMessage = this.getErrorMessage(error);
    }

    await this.publicationRepository.save(publication);
    if (publication.status === SocialPublicationStatus.FAILED) {
      await this.pauseAllPublishing(publication.errorMessage || 'Social publication failed');
    }
  }

  private async checkAccountsBeforePublishing(
    publication: SocialPublication,
    rule: SocialPublishingRule,
  ): Promise<boolean> {
    try {
      await this.getProvider(rule.provider).assertAccountsReady(rule.projectId, rule.accountIds);
      return true;
    } catch (error) {
      const reason = this.getErrorMessage(error);

      if (error instanceof SocialProviderAccountsNotReadyError) {
        await this.failAndPause(publication, reason);
        return false;
      }

      publication.status = SocialPublicationStatus.QUEUED;
      publication.errorMessage = `Temporary PostMyPost account check error: ${reason}`;
      await this.publicationRepository.save(publication);
      this.logger.warn(
        `Deferred social publication ${publication.id}: ${reason}`,
        this.checkAccountsBeforePublishing.name,
      );
      return false;
    }
  }

  private async submitYoutube(
    publication: SocialPublication,
    rule: SocialPublishingRule,
  ): Promise<void> {
    if (!publication.youtubeAssetId) throw new Error('YouTube publication asset is missing');
    const asset = await this.dataSource
      .getRepository(SocialYoutubeClip)
      .findOneBy({ id: publication.youtubeAssetId });
    if (!asset) throw new Error('YouTube publication asset no longer exists');
    const provider = this.getProvider(rule.provider);
    if (publication.externalFileId) {
      publication.scheduledAt = new Date(
        Math.max(publication.scheduledAt.getTime(), Date.now() + IMMEDIATE_PUBLICATION_DELAY_MS),
      );
      const values = {
        title: asset.title,
        description: asset.description ?? '',
        hook: asset.title,
        clipIndex: '1',
        contentType: 'youtube',
        contentId: asset.videoId,
        sourceGroup: 'YouTube',
      };
      const result = await provider.scheduleUploadedVideo({
        projectId: rule.projectId,
        accountIds: rule.accountIds,
        externalFileId: publication.externalFileId,
        scheduledAt: publication.scheduledAt,
        title: this.interpolate(rule.titleTemplate, values),
        caption: this.interpolate(rule.captionTemplate || DEFAULT_CAPTION_TEMPLATE, values)?.trim(),
      });
      publication.status = SocialPublicationStatus.SCHEDULED;
      publication.externalPublicationId = result.externalPublicationId;
      publication.providerPayload = result.raw;
    } else if (publication.externalUploadId) {
      publication.status = SocialPublicationStatus.PROCESSING;
    } else {
      const media = await this.shortContentClient.youtubePublishingUrl(asset.id);
      const upload = await provider.startVideoUpload({
        projectId: rule.projectId,
        videoUrl: media.url,
      });
      publication.status = SocialPublicationStatus.PROCESSING;
      publication.externalUploadId = upload.externalUploadId;
      publication.providerPayload = upload.raw;
    }
  }

  private async getContentMetadata(
    job: ShortContentJob,
  ): Promise<{ title: string; description: string }> {
    let content: { title: string; description: string | null } | null = null;

    switch (job.contentType) {
      case ShortContentType.FILM: {
        content = await this.dataSource.getRepository(Film).findOne({
          where: { id: job.contentId },
          select: { title: true, description: true },
        });
        break;
      }
      case ShortContentType.CARTOON: {
        content = await this.dataSource.getRepository(Cartoon).findOne({
          where: { id: job.contentId },
          select: { title: true, description: true },
        });
        break;
      }
      case ShortContentType.SERIAL: {
        content = await this.dataSource.getRepository(Serial).findOne({
          where: { id: job.contentId },
          select: { title: true, description: true },
        });
        break;
      }
    }

    return {
      title: content?.title?.trim() || job.contentTitle?.trim() || `Контент ${job.contentId}`,
      description: content?.description?.trim() || '',
    };
  }

  private async refreshProcessingUploads(): Promise<void> {
    const publications = await this.publicationRepository.find({
      where: { status: SocialPublicationStatus.PROCESSING },
      order: { updatedAt: 'ASC' },
      // PostMyPost limits /upload/* to 10 requests per rolling minute.
      take: 8,
    });

    for (const publication of publications) {
      if (!publication.externalUploadId) {
        await this.failAndPause(publication, 'PostMyPost upload id is missing');
        continue;
      }

      try {
        const result = await this.getProvider(publication.provider).getVideoUploadStatus(
          publication.externalUploadId,
        );
        publication.providerPayload = result.raw;

        if (result.status === 'failed') {
          publication.externalUploadId = null;
          publication.externalFileId = null;
          await this.failAndPause(publication, 'PostMyPost failed to process the video');
          continue;
        }

        if (result.status === 'ready' && result.externalFileId) {
          publication.externalFileId = result.externalFileId;
          publication.status = SocialPublicationStatus.QUEUED;
          publication.errorMessage = null;
        } else {
          publication.status = SocialPublicationStatus.PROCESSING;
          publication.errorMessage = null;
        }
        await this.publicationRepository.save(publication);
      } catch (error) {
        const reason = this.getErrorMessage(error);
        publication.status = SocialPublicationStatus.PROCESSING;
        publication.errorMessage = `Temporary PostMyPost upload status error: ${reason}`;
        await this.publicationRepository.save(publication);
        this.logger.warn(
          `Cannot refresh PostMyPost upload ${publication.externalUploadId}: ${reason}`,
          this.refreshProcessingUploads.name,
        );
      }
    }
  }

  private async refreshScheduledPublications(): Promise<void> {
    const now = new Date();
    const publications = await this.publicationRepository.find({
      where: [
        {
          status: SocialPublicationStatus.SCHEDULED,
          scheduledAt: LessThanOrEqual(now),
        },
        {
          status: SocialPublicationStatus.SUBMITTING,
          scheduledAt: LessThanOrEqual(now),
        },
      ],
      order: { scheduledAt: 'ASC' },
      // PostMyPost allows 30 regular API requests per rolling minute.
      // Keep headroom for project/account requests from the admin UI.
      take: 20,
    });

    for (const publication of publications) {
      if (!publication.externalPublicationId) continue;

      try {
        const wasImmediate = publication.status === SocialPublicationStatus.SUBMITTING;
        const result = await this.getProvider(publication.provider).getPublicationStatus(
          publication.externalPublicationId,
        );
        publication.providerPayload = result.raw;

        if (result.status === 'failed') {
          await this.failAndPause(
            publication,
            this.providerFailureMessage(publication, result.failureReason),
          );
          continue;
        }

        if (result.status === 'published') {
          publication.status = SocialPublicationStatus.PUBLISHED;
        } else if (result.status === 'publishing') {
          publication.status = SocialPublicationStatus.SUBMITTING;
        } else if (
          wasImmediate &&
          Date.now() > publication.scheduledAt.getTime() + STUCK_PUBLICATION_GRACE_MS
        ) {
          await this.failAndPause(
            publication,
            `PostMyPost did not start publication ${publication.externalPublicationId} within 5 minutes`,
          );
          continue;
        } else {
          publication.status = wasImmediate
            ? SocialPublicationStatus.SUBMITTING
            : SocialPublicationStatus.SCHEDULED;
        }

        publication.errorMessage = null;
        await this.publicationRepository.save(publication);
      } catch (error) {
        const reason = this.getErrorMessage(error);
        this.logger.warn(
          `Cannot refresh social publication ${publication.id}: ${reason}`,
          this.refreshScheduledPublications.name,
        );
        publication.errorMessage = `Temporary PostMyPost publication status error: ${reason}`;
        await this.publicationRepository.save(publication);
      }
    }
  }

  private async recoverInterruptedSubmissions(): Promise<number> {
    const interruptedBefore = new Date(Date.now() - 10 * 60_000);

    const result = await this.publicationRepository
      .createQueryBuilder()
      .update(SocialPublication)
      .set({
        status: SocialPublicationStatus.FAILED,
        errorMessage: INTERRUPTED_SUBMISSION_ERROR,
      })
      .where('status = :status', { status: SocialPublicationStatus.SUBMITTING })
      .andWhere('"externalPublicationId" IS NULL')
      .andWhere('"updatedAt" < :interruptedBefore', { interruptedBefore })
      .execute();

    return result.affected ?? 0;
  }

  private async reconcileInterruptedPublications(): Promise<number> {
    const publications = await this.publicationRepository.find({
      where: {
        status: SocialPublicationStatus.FAILED,
        errorMessage: INTERRUPTED_SUBMISSION_ERROR,
      },
      order: { updatedAt: 'ASC' },
      take: 20,
    });
    let reconciled = 0;

    for (const publication of publications) {
      if (!publication.externalPublicationId) continue;

      try {
        const result = await this.getProvider(publication.provider).getPublicationStatus(
          publication.externalPublicationId,
        );
        publication.providerPayload = result.raw;

        if (result.status === 'published') {
          publication.status = SocialPublicationStatus.PUBLISHED;
          publication.errorMessage = null;
          reconciled += 1;
        } else if (result.status === 'publishing' || result.status === 'scheduled') {
          publication.status = SocialPublicationStatus.SUBMITTING;
          publication.errorMessage = null;
          reconciled += 1;
        } else {
          publication.errorMessage = this.providerFailureMessage(publication, result.failureReason);
        }

        await this.publicationRepository.save(publication);
      } catch (error) {
        this.logger.warn(
          `Cannot reconcile interrupted publication ${publication.id}: ${this.getErrorMessage(
            error,
          )}`,
          this.reconcileInterruptedPublications.name,
        );
      }
    }

    return reconciled;
  }

  private async resumeAfterReconciledInterruptions(): Promise<void> {
    const hasFailedPublications = await this.publicationRepository.exists({
      where: { status: SocialPublicationStatus.FAILED },
    });
    if (hasFailedPublications) return;

    const pausedRules = await this.ruleRepository.find({ where: { pausedByFailure: true } });
    if (
      pausedRules.length === 0 ||
      pausedRules.some(rule => !rule.pauseReason?.includes(INTERRUPTED_SUBMISSION_PAUSE_FRAGMENT))
    ) {
      return;
    }

    try {
      await this.resumeAfterFailure();
    } catch (error) {
      this.logger.warn(
        `Cannot resume publishing after reconciliation: ${this.getErrorMessage(error)}`,
        this.resumeAfterReconciledInterruptions.name,
      );
    }
  }

  private async cleanupPublishedClips(): Promise<void> {
    const [published, rules] = await Promise.all([
      this.publicationRepository.find({
        where: {
          status: SocialPublicationStatus.PUBLISHED,
          clipDeletedAt: IsNull(),
          sourceGroup: 'own',
        },
        order: { updatedAt: 'ASC' },
        take: 20,
      }),
      this.ruleRepository.find(),
    ]);

    for (const publication of published) {
      // YouTube assets have their own cleanup and revision/queue guards below.
      if (publication.sourceGroup === 'youtube' || publication.shortContentJobId === null) continue;
      const job = await this.shortContentJobRepository.findOne({
        where: { id: publication.shortContentJobId },
      });
      if (!job) {
        await this.markClipDeleted(publication.shortContentJobId, publication.clipIndex);
        continue;
      }

      if (!job.shortContentJobId) {
        await this.markClipDeleted(job.id, publication.clipIndex);
        continue;
      }

      const clips = this.getClips(job);
      if (!clips.some(clip => clip.index === publication.clipIndex)) {
        await this.markClipDeleted(job.id, publication.clipIndex);
        continue;
      }

      const applicableRules = rules.filter(
        rule =>
          (rule.isEnabled || rule.pausedByFailure) &&
          (rule.sourceGroups ?? ['own']).includes('own') &&
          rule.contentTypes.includes(job.contentType),
      );
      const publicationsForClip = await this.publicationRepository.find({
        where: {
          shortContentJobId: job.id,
          clipIndex: publication.clipIndex,
        },
        select: { ruleId: true, status: true },
      });
      const publishedRuleIds = new Set(
        publicationsForClip
          .filter(item => item.status === SocialPublicationStatus.PUBLISHED)
          .map(item => item.ruleId),
      );

      if (applicableRules.some(rule => !publishedRuleIds.has(rule.id))) continue;

      try {
        await this.shortContentClient.deleteHighlightClip(
          job.shortContentJobId,
          publication.clipIndex,
        );

        const remainingClips = clips.filter(clip => clip.index !== publication.clipIndex);
        if (remainingClips.length === 0) {
          await this.shortContentJobRepository.remove(job);
        } else {
          job.draftPayload = { ...(job.draftPayload ?? {}), clips: remainingClips };
          job.updatedAt = new Date();
          await this.shortContentJobRepository.save(job);
        }
        await this.markClipDeleted(job.id, publication.clipIndex);
      } catch (error) {
        this.logger.warn(
          `Cannot delete published clip ${job.id}:${publication.clipIndex}: ${this.getErrorMessage(
            error,
          )}`,
          this.cleanupPublishedClips.name,
        );
      }
    }
  }

  private async markClipDeleted(shortContentJobId: number, clipIndex: number): Promise<void> {
    await this.publicationRepository.update(
      { shortContentJobId, clipIndex },
      { clipDeletedAt: new Date() },
    );
  }

  private async cleanupPublishedYoutubeClips(): Promise<void> {
    const published = await this.publicationRepository.find({
      where: {
        status: SocialPublicationStatus.PUBLISHED,
        sourceGroup: 'youtube',
        clipDeletedAt: IsNull(),
      },
      order: { updatedAt: 'ASC' },
      take: 100,
    });
    const visited = new Set<string>();
    for (const publication of published) {
      const id = publication.youtubeAssetId;
      if (!id || visited.has(id)) continue;
      visited.add(id);
      try {
        await this.dataSource.transaction(async manager => {
          const assets = manager.getRepository(SocialYoutubeClip);
          const candidate = await assets.findOneBy({ id });
          if (!candidate) return; // Missing identity is not permission to remove media.
          // Serialize cleanup of different revisions of the same source across workers.
          await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
            `social-youtube:${candidate.videoId}`,
          ]);
          const asset = await assets.findOne({
            where: { id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!asset) return;
          const publications = manager.getRepository(SocialPublication);
          const history = await publications.find({ where: { youtubeAssetId: id } });
          // A disabled rule may still have an outstanding upload, scheduled post or retry.
          if (
            !history.length ||
            history.some(item => item.status !== SocialPublicationStatus.PUBLISHED)
          )
            return;
          const rules = await manager.getRepository(SocialPublishingRule).find();
          const done = new Set(history.map(item => item.ruleId));
          if (
            rules.some(
              rule =>
                (rule.isEnabled || rule.pausedByFailure) &&
                rule.sourceGroups?.includes('youtube') &&
                !done.has(rule.id),
            )
          )
            return;
          const siblings = await assets.find({ where: { videoId: asset.videoId } });
          const removeSource = siblings.every(item => item.id === id || !!item.deletedAt);
          const sourceRevision = Math.max(asset.revision, ...siblings.map(item => item.revision));
          const result = await this.shortContentClient.deleteYoutubePublication(id, {
            videoId: asset.videoId,
            revision: asset.revision,
            sourceRevision,
            removeSource,
          });
          if (result.removed !== true || (result.sourceRemoved === true && !removeSource))
            throw new Error('Worker did not confirm safe media deletion');
          const deletedAt = asset.deletedAt ?? new Date();
          await assets.update({ id }, { deletedAt });
          await publications.update({ youtubeAssetId: id }, { clipDeletedAt: deletedAt });
          if (result.sourceRemoved === true) {
            await manager.getRepository(YoutubeVideo).update(
              { videoId: asset.videoId },
              {
                downloadStatus: 'skipped',
                downloadRetryAt: null,
                downloadError: 'Файлы удалены после успешной публикации',
                downloadUpdatedAt: deletedAt,
              },
            );
          }
        });
      } catch (error) {
        this.logger.warn(
          `Cannot delete published YouTube clip ${id}: ${this.getErrorMessage(error)}`,
          this.cleanupPublishedYoutubeClips.name,
        );
      }
    }
  }

  private providerFailureMessage(
    publication: Pick<SocialPublication, 'externalPublicationId'>,
    reason?: string,
  ): string {
    const id = publication.externalPublicationId;
    return reason
      ? `PostMyPost: ${reason}${id ? ` (публикация #${id})` : ''}`
      : `PostMyPost сообщил об ошибке${id ? ` для публикации #${id}` : ''}, но не передал описание`;
  }

  private isGloballyPaused(): Promise<boolean> {
    return this.ruleRepository.exists({ where: { pausedByFailure: true } });
  }

  private async assertPublishingCanStart(): Promise<void> {
    if (await this.isGloballyPaused()) {
      throw new BadRequestException(
        'Social publishing is paused after an error. Resume all rules before publishing again.',
      );
    }
  }

  private async pauseAllPublishing(reason: string): Promise<void> {
    const pauseReason = reason.trim().slice(0, 2_000) || 'Unknown social publishing error';
    const pausedAt = new Date();
    const result = await this.ruleRepository
      .createQueryBuilder()
      .update(SocialPublishingRule)
      .set({
        isEnabled: false,
        pausedByFailure: true,
        pausedAt,
        pauseReason,
      })
      .where('"isEnabled" = true OR "pausedByFailure" = true')
      .execute();

    if ((result.affected ?? 0) > 0) {
      this.logger.warn(
        `All social publishing rules paused: ${pauseReason}`,
        this.pauseAllPublishing.name,
      );
    }
  }

  private async failAndPause(publication: SocialPublication, reason: string): Promise<void> {
    publication.status = SocialPublicationStatus.FAILED;
    publication.errorMessage = reason;
    await this.publicationRepository.save(publication);
    await this.pauseAllPublishing(reason);
  }

  private async failPendingPublication(id: number, reason: string): Promise<void> {
    const publication = await this.publicationRepository.findOne({ where: { id } });
    if (!publication || publication.status === SocialPublicationStatus.PUBLISHED) return;
    await this.failAndPause(publication, reason);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async disableExpiredRules(now: Date): Promise<void> {
    await this.ruleRepository
      .createQueryBuilder()
      .update(SocialPublishingRule)
      .set({ isEnabled: false })
      .where('"isEnabled" = true')
      .andWhere('"endAt" IS NOT NULL')
      .andWhere('"endAt" < :now', { now })
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

  private getNextRunAfterScheduleChange(rule: SocialPublishingRule, now: Date): Date {
    const notBefore = rule.startAt > now ? rule.startAt : now;

    if (rule.dailyTimes?.length) {
      return getFirstDailyRunAt(notBefore, rule.dailyTimes, rule.timezone);
    }

    if (rule.startAt >= notBefore) return rule.startAt;

    const step = rule.intervalMinutes * 60_000;
    const elapsed = notBefore.getTime() - rule.startAt.getTime();
    return new Date(rule.startAt.getTime() + Math.ceil(elapsed / step) * step);
  }

  private validateTimeZone(timeZone: string): void {
    try {
      assertValidTimeZone(timeZone);
    } catch {
      throw new BadRequestException(`Unsupported timezone: ${timeZone}`);
    }
  }

  private validateEndAt(startAt: Date, endAt: Date | null): void {
    if (endAt && endAt < startAt) {
      throw new BadRequestException('Publishing end must not be earlier than its start');
    }
  }

  private async getRuleOrThrow(id: number): Promise<SocialPublishingRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });

    if (!rule) throw new NotFoundException('Social publishing rule not found');
    return rule;
  }
}
