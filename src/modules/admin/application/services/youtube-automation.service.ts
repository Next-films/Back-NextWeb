import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, Repository } from 'typeorm';
import { YoutubeAutomation } from '../../domain/youtube-automation.entity';
import { YoutubeArchiveState, YoutubeSource } from '../../domain/youtube-source.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { YoutubeReaderService, YoutubeVideoOwnerError } from './youtube-reader.service';
import { YoutubeProcessingService } from './youtube-processing.service';
import { ShortContentClientService } from './short-content-client.service';

/** One persisted archive cursor per channel; downloads remain bounded and never auto-render. */
@Injectable()
export class YoutubeAutomationService implements OnModuleDestroy {
  private active: Promise<void> | null = null;
  private stopped = false;
  constructor(
    private readonly database: DataSource,
    @InjectRepository(YoutubeAutomation) private readonly settings: Repository<YoutubeAutomation>,
    @InjectRepository(YoutubeSource) private readonly sources: Repository<YoutubeSource>,
    @InjectRepository(YoutubeVideo) private readonly videos: Repository<YoutubeVideo>,
    private readonly reader: YoutubeReaderService,
    private readonly processing: YoutubeProcessingService,
    private readonly worker: ShortContentClientService,
  ) {}

  onModuleDestroy(): void {
    this.stopped = true;
  }

  async overview() {
    const settings = await this.settings.findOneBy({ id: 1 });
    const sources = await this.sources.find({
      where: { enabled: true },
      order: { createdAt: 'ASC' },
    });
    const ids = [
      ...new Set(sources.map(source => source.channelId).filter((id): id is string => Boolean(id))),
    ];
    const counts = ids.length
      ? await this.videos
          .createQueryBuilder('video')
          .select('COALESCE(video."downloadStatus", :unsubmitted)', 'status')
          .addSelect('COUNT(*)::int', 'count')
          .where('video."channelId" IN (:...ids)', { ids })
          .andWhere('video."isShort" = true')
          .setParameter('unsubmitted', 'pending')
          .groupBy('COALESCE(video."downloadStatus", :unsubmitted)')
          .getRawMany<{ status: string; count: number }>()
      : [];
    let worker: Record<string, unknown> | null = null;
    try {
      worker = await this.worker.youtubeQueue();
    } catch {
      /* Config errors are displayed, not guessed as success. */
    }
    return {
      enabled: settings?.enabled ?? false,
      includeArchive: settings?.includeArchive ?? true,
      running: this.active !== null,
      lastRunAt: settings?.lastRunAt ?? null,
      lastError: settings?.lastError ?? null,
      counts: Object.fromEntries(counts.map(item => [item.status, Number(item.count)])),
      worker,
      channels: sources.map(source => ({
        source: source.source,
        channelName: source.channelName,
        archiveComplete: source.archiveComplete,
        archiveError: source.archiveError,
        archiveCompletedAt: source.archiveCompletedAt,
      })),
    };
  }

  async configure(input: unknown) {
    const body = input as {
      enabled?: unknown;
      includeArchive?: unknown;
      channelsConfirmed?: unknown;
      restartArchive?: unknown;
    } | null;
    if (
      !body ||
      typeof body.enabled !== 'boolean' ||
      typeof body.includeArchive !== 'boolean' ||
      (body.enabled && body.channelsConfirmed !== true)
    )
      throw new BadRequestException('Подтвердите автоскачивание Shorts всех добавленных каналов');
    const enabled = body.enabled;
    const includeArchive = body.includeArchive;
    await this.database.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock($1,$2)', [1793200000, 4]);
      if (body.restartArchive === true) {
        const rows = await manager.query(
          'SELECT pg_try_advisory_xact_lock($1,$2) AS locked',
          [1793200000, 1],
        );
        if (rows[0]?.locked !== true)
          throw new ConflictException(
            'Дождитесь завершения текущего прохода YouTube и повторите перепроверку истории',
          );
      }
      await manager.upsert(YoutubeAutomation, { id: 1, enabled, includeArchive }, ['id']);
      if (body.restartArchive === true)
        await manager.update(
          YoutubeSource,
          { enabled: true },
          {
            archiveState: null,
            archiveComplete: false,
            archiveCompletedAt: null,
            archiveError: null,
          },
        );
    });
    if (body.enabled) this.tick();
    return this.overview();
  }

  @Cron('15 * * * * *')
  tick(): void {
    if (this.active || this.stopped) return;
    this.active = this.run()
      .catch(async () => {
        await this.settings
          .update(
            { id: 1 },
            { lastError: 'Автоскачивание приостановлено из-за ошибки; прогресс сохранён.' },
          )
          .catch(() => {});
      })
      .finally(() => {
        this.active = null;
      });
  }

  private async enabled(): Promise<boolean> {
    return !this.stopped && (await this.settings.findOneBy({ id: 1 }))?.enabled === true;
  }

  private async run(): Promise<void> {
    if (!(await this.enabled())) return;
    const runner = this.database.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      // Shares the metadata synchroniser's lock: no parallel anonymous YouTube storms.
      locked =
        (await runner.query('SELECT pg_try_advisory_lock($1,$2) AS locked', [1793200000, 1]))[0]
          ?.locked === true;
      if (!locked) return;
      const worker = (await this.worker.youtubeQueue()) as {
        enabled?: boolean;
        capacity?: number;
        pauseReason?: string;
      };
      await this.settings.update({ id: 1 }, { lastRunAt: new Date(), lastError: null });
      const channels = await this.sources.find({
        where: { enabled: true },
        order: { createdAt: 'ASC' },
      });
      const ids = [
        ...new Set(
          channels.map(channel => channel.channelId).filter((id): id is string => Boolean(id)),
        ),
      ];
      if (!ids.length) return;
      const deadline = Date.now() + 30_000;
      await this.refreshQueued(ids, deadline);
      if (!worker.enabled || !worker.capacity) {
        await this.settings.update(
          { id: 1 },
          {
            lastError:
              worker.pauseReason || 'Загрузка ожидает свободного места или доступного worker.',
          },
        );
        return;
      }
      if (Date.now() >= deadline || !(await this.enabled())) return;
      const pending = await this.videos
        .createQueryBuilder('video')
        .where('video."channelId" IN (:...ids)', { ids })
        .andWhere('video."isShort" = true')
        .andWhere('video."lastSyncedAt" IS NOT NULL')
        .andWhere(
          '(video."downloadStatus" IS NULL OR video."downloadStatus" = :pending OR (video."downloadStatus" = :failed AND video."downloadAttempts" < 3 AND video."downloadRetryAt" <= :now))',
          { pending: 'pending', failed: 'failed', now: new Date() },
        )
        .orderBy('video."publishedAt"', 'DESC', 'NULLS LAST')
        .addOrderBy('video."firstSeenAt"', 'DESC')
        .take(Math.min(10, worker.capacity))
        .getMany();
      for (const video of pending) {
        if (Date.now() >= deadline || !(await this.enabled())) break;
        try {
          const result = (await this.processing.download(video.videoId, {
            contentConfirmed: true,
            downloadOnly: true,
          })) as { job?: { originalAvailable?: boolean; status?: string } };
          if (!result.job) throw new Error('Missing worker acknowledgement');
          await this.videos.update(
            { videoId: video.videoId },
            {
              downloadStatus: result.job.originalAvailable ? 'downloaded' : 'queued',
              downloadAttempts: (video.downloadAttempts ?? 0) + 1,
              downloadUpdatedAt: new Date(),
              downloadError: null,
              downloadRetryAt: null,
            },
          );
        } catch {
          await this.failed({ ...video, downloadAttempts: (video.downloadAttempts ?? 0) + 1 });
          // Transport/config/quota errors should not burn retries for the rest of the queue.
          break;
        }
      }
      const state = await this.settings.findOneBy({ id: 1 });
      if (state?.includeArchive && !this.reader.coolingDown && Date.now() < deadline) {
        for (const channel of channels) {
          if (
            channel.archiveComplete &&
            channel.archiveCompletedAt &&
            Date.now() - channel.archiveCompletedAt.getTime() > 24 * 60 * 60_000
          ) {
            await this.sources.update(
              { source: channel.source },
              { archiveComplete: false, archiveState: null, archiveError: null },
            );
            channel.archiveComplete = false;
            channel.archiveState = null;
          }
        }
        const candidates = channels.filter(
          channel => !channel.archiveComplete && channel.channelId,
        );
        const channel = candidates.sort(
          (a, b) => (a.archiveCompletedAt?.getTime() ?? 0) - (b.archiveCompletedAt?.getTime() ?? 0),
        )[0];
        if (channel && (await this.enabled())) await this.archive(channel, deadline);
      }
    } finally {
      try {
        if (locked) await runner.query('SELECT pg_advisory_unlock($1,$2)', [1793200000, 1]);
      } finally {
        await runner.release();
      }
    }
  }

  private async failed(video: YoutubeVideo): Promise<void> {
    const attempts = Math.max(1, video.downloadAttempts ?? 1);
    await this.videos.update(
      { videoId: video.videoId },
      {
        downloadStatus: 'failed',
        downloadAttempts: attempts,
        downloadRetryAt: new Date(Date.now() + Math.min(120, 10 * 3 ** (attempts - 1)) * 60_000),
        downloadError: 'Не удалось скачать Shorts. Будет до трёх попыток с паузами.',
        downloadUpdatedAt: new Date(),
      },
    );
  }

  private async refreshQueued(ids: string[], deadline: number): Promise<void> {
    const queued = await this.videos
      .createQueryBuilder('video')
      .where('video."channelId" IN (:...ids)', { ids })
      .andWhere('video."downloadStatus" = :queued', { queued: 'queued' })
      .orderBy('video."downloadUpdatedAt"', 'ASC')
      .take(20)
      .getMany();
    for (const video of queued) {
      if (Date.now() >= deadline || !(await this.enabled())) break;
      const response = (await this.processing.status(video.videoId)) as {
        job?: { originalAvailable?: boolean; status?: string } | null;
      };
      if (response.job?.originalAvailable)
        await this.videos.update(
          { videoId: video.videoId },
          { downloadStatus: 'downloaded', downloadError: null, downloadUpdatedAt: new Date() },
        );
      else if (!response.job || response.job.status === 'failed') await this.failed(video);
    }
  }

  private async archive(source: YoutubeSource, deadline: number): Promise<void> {
    if (!source.channelId) return;
    let state: YoutubeArchiveState = source.archiveState ?? {
      token: null,
      nextToken: null,
      loaded: false,
      pending: [],
    };
    try {
      if (!state.loaded) {
        const page = await this.reader.readShortsArchivePage(source.channelId, state.token);
        if (state.token && page.nextToken === state.token)
          throw new Error('Repeated archive cursor');
        state = { ...state, loaded: true, nextToken: page.nextToken, pending: page.videos };
        await this.sources.update(
          { source: source.source, enabled: true },
          { archiveState: state },
        );
      }
      // A complete source is checked separately by the normal recent-video monitor.
      const batch = state.pending.slice(0, 10);
      for (const item of batch) {
        if (
          Date.now() >= deadline ||
          this.reader.coolingDown ||
          !(await this.enabled()) ||
          !(await this.sources.exist({ where: { source: source.source, enabled: true } }))
        )
          break;
        try {
          const old = await this.videos.findOneBy({ videoId: item.videoId });
          if (
            !old ||
            old.channelId !== source.channelId ||
            !old.lastSyncedAt ||
            old.isShort !== true
          ) {
            const { commentsReadFailed, ...detail } = await this.reader.readVideo(
              item.videoId,
              source.channelId,
            );
            await this.videos.save(
              this.videos.create({
                ...old,
                ...detail,
                isShort: true,
                comments: commentsReadFailed ? old?.comments ?? null : detail.comments,
                commentsUpdatedAt: commentsReadFailed ? old?.commentsUpdatedAt ?? null : new Date(),
                lastAttemptAt: new Date(),
                lastSyncedAt: new Date(),
                lastError: null,
              }),
            );
          }
          state.pending = state.pending.filter(candidate => candidate.videoId !== item.videoId);
        } catch (error) {
          if (error instanceof YoutubeVideoOwnerError || (item.attempts ?? 0) >= 2) {
            state.pending = state.pending.filter(candidate => candidate.videoId !== item.videoId);
            await this.sources.update(
              { source: source.source },
              {
                archiveError:
                  'Некоторые записи архива недоступны или принадлежат другому каналу; они пропущены.',
              },
            );
          } else item.attempts = (item.attempts ?? 0) + 1;
        }
        await this.sources.update(
          { source: source.source, enabled: true },
          { archiveState: state },
        );
      }
      if (!state.pending.length) {
        await this.sources.update(
          { source: source.source, enabled: true },
          {
            archiveComplete: !state.nextToken,
            archiveState: state.nextToken
              ? { token: state.nextToken, nextToken: null, loaded: false, pending: [] }
              : null,
            archiveCompletedAt: new Date(),
          },
        );
      } else
        await this.sources.update(
          { source: source.source, enabled: true },
          { archiveCompletedAt: new Date() },
        );
    } catch {
      await this.sources.update(
        { source: source.source },
        { archiveError: 'Продолжение архива временно недоступно. Курсор и очередь сохранены.' },
      );
    }
  }
}
