import { BadRequestException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { YoutubeSource } from '../../domain/youtube-source.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { YoutubeReaderService, YoutubeVideoOwnerError } from './youtube-reader.service';
import { normalizeYoutubeSource, normalizeYoutubeSources } from './youtube-source';
import { AdminYoutubeVideosQueryDto } from '../../api/dtos/input/admin-youtube-monitor.input.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

const LOCK_GROUP = 1793200000;

@Injectable()
export class YoutubeMonitorService implements OnModuleDestroy {
  private readonly logger = new Logger(YoutubeMonitorService.name);
  private active: Promise<void> | null = null;
  private stopping = false;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(YoutubeSource) private readonly sources: Repository<YoutubeSource>,
    @InjectRepository(YoutubeVideo) private readonly videos: Repository<YoutubeVideo>,
    private readonly reader: YoutubeReaderService,
  ) {}

  onModuleDestroy(): void {
    this.stopping = true;
  }

  async overview(query: AdminYoutubeVideosQueryDto) {
    const channels = await this.sources.find({
      where: { enabled: true },
      order: { createdAt: 'ASC' },
    });
    const source = query.source ? this.normalize([query.source])[0] : undefined;
    const selected = channels.filter(channel => !source || channel.source === source);
    const channelIds = [
      ...new Set(
        selected.map(channel => channel.channelId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const [items, total] = channelIds.length
      ? await this.videos
          .createQueryBuilder('video')
          .where('video.channelId IN (:...channelIds)', { channelIds })
          .orderBy('COALESCE(video."publishedAt", video."firstSeenAt")', 'DESC')
          .addOrderBy('video.videoId', 'ASC')
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getManyAndCount()
      : [[], 0];
    return {
      accounts: channels.map(channel => channel.source),
      channels: channels.map(channel => ({ ...channel, archiveState: undefined })),
      videos: items,
      total,
      page,
      pageSize,
      sync: {
        running: this.active !== null,
        coolingDown: this.reader.coolingDown,
        intervalMinutes: 30,
        perChannelLimit: 50,
      },
    };
  }

  async saveAccounts(inputs: string[]) {
    const accounts = this.normalize(inputs);
    await this.dataSource.transaction(async manager => {
      // Serialise concurrent full-list edits, including the initially empty table.
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [LOCK_GROUP, 2]);
      await manager.update(YoutubeSource, { enabled: true }, { enabled: false });
      if (accounts.length)
        await manager.upsert(
          YoutubeSource,
          accounts.map(source => ({ source, enabled: true })),
          ['source'],
        );
    });
    // Removing an account hides its cache; it does not destroy previously collected videos.
    return { accounts };
  }

  private normalize(inputs: string[]): string[] {
    try {
      return normalizeYoutubeSources(inputs);
    } catch (error) {
      throw new BadRequestException({
        field: 'accounts',
        errorKey: EXCEPTION_KEYS_ENUM.INVALID_YOUTUBE_SOURCE,
        message: error instanceof Error ? error.message : 'Некорректный список каналов',
      });
    }
  }

  startSync(): { running: boolean; alreadyRunning: boolean; coolingDown: boolean } {
    if (this.active || this.stopping || this.reader.coolingDown)
      return {
        running: Boolean(this.active),
        alreadyRunning: Boolean(this.active),
        coolingDown: this.reader.coolingDown,
      };
    this.active = this.runSync()
      .catch(() => {
        // Never log upstream payloads, cookies or session information.
        this.logger.warn('YouTube synchronisation interrupted; cached results are retained');
      })
      .finally(() => {
        this.active = null;
      });
    return { running: true, alreadyRunning: false, coolingDown: false };
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  syncOnSchedule(): void {
    this.startSync();
  }

  private async runSync(): Promise<void> {
    // No configured sources means no external requests and no model/worker process.
    const accounts = await this.sources.find({
      where: { enabled: true },
      order: { createdAt: 'ASC' },
    });
    if (!accounts.length) return;
    const runDeadline = Date.now() + 20 * 60_000;
    const runner = this.dataSource.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      const result = await runner.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [
        LOCK_GROUP,
        1,
      ]);
      locked = result[0]?.locked === true;
      if (!locked) return;
      const completed = new Map<string, { channelName: string; lastSyncedAt: Date }>();
      for (const account of accounts) {
        if (this.stopping || this.reader.coolingDown || Date.now() >= runDeadline) break;
        if (!(await this.sources.exist({ where: { source: account.source, enabled: true } })))
          continue;
        const attemptedAt = new Date();
        const channelDeadline = Math.min(runDeadline, Date.now() + 3 * 60_000);
        await this.sources.update({ source: account.source }, { lastAttemptAt: attemptedAt });
        try {
          // Alias entries for the same channel share one video cache and one detail refresh per run.
          const previous = account.channelId ? completed.get(account.channelId) : undefined;
          if (previous) {
            await this.sources.update(
              { source: account.source, enabled: true },
              { ...previous, lastError: null },
            );
            continue;
          }
          const channel = await this.reader.readChannel(normalizeYoutubeSource(account.source));
          const duplicate = completed.get(channel.channelId);
          await this.sources.update(
            { source: account.source, enabled: true },
            {
              channelId: channel.channelId,
              channelName: channel.channelName,
            },
          );
          if (duplicate) {
            await this.sources.update(
              { source: account.source, enabled: true },
              { ...duplicate, lastError: null },
            );
            continue;
          }
          let failures = 0;
          for (const item of channel.videos) {
            if (
              this.stopping ||
              this.reader.coolingDown ||
              Date.now() >= channelDeadline ||
              !(await this.sources.exist({ where: { source: account.source, enabled: true } }))
            )
              break;
            const old = await this.videos.findOneBy({ videoId: item.videoId });
            const now = new Date();
            try {
              const detail = await this.reader.readVideo(item.videoId, channel.channelId);
              const { commentsReadFailed, ...data } = detail;
              await this.videos.save(
                this.videos.create({
                  ...old,
                  ...data,
                  isShort: item.isShort === true,
                  comments: commentsReadFailed ? old?.comments ?? null : detail.comments,
                  commentsUpdatedAt: commentsReadFailed ? old?.commentsUpdatedAt ?? null : now,
                  lastAttemptAt: now,
                  lastSyncedAt: now,
                  lastError: commentsReadFailed
                    ? 'Количество комментариев не обновлено; последнее значение сохранено.'
                    : null,
                }),
              );
            } catch (error) {
              failures++;
              if (error instanceof YoutubeVideoOwnerError) {
                await this.pause();
                continue;
              }
              if (old) {
                await this.videos.update(
                  { videoId: item.videoId },
                  {
                    lastAttemptAt: now,
                    lastError: 'Видео не обновлено. Сохранены последние полученные данные.',
                  },
                );
              } else {
                await this.videos.save(
                  this.videos.create({
                    ...item,
                    channelId: channel.channelId,
                    description: null,
                    publishedAt: null,
                    likes: null,
                    comments: null,
                    commentsUpdatedAt: null,
                    lastAttemptAt: now,
                    lastSyncedAt: null,
                    lastError: 'Описание и счётчики пока недоступны.',
                  }),
                );
              }
            }
            await this.pause();
          }
          const finishedAt = new Date();
          const interrupted =
            this.stopping || this.reader.coolingDown || Date.now() >= channelDeadline;
          await this.sources.update(
            { source: account.source, enabled: true },
            {
              ...(!interrupted ? { lastSyncedAt: finishedAt } : {}),
              lastError: interrupted
                ? 'Обновление приостановлено. Последние данные сохранены.'
                : failures
                ? `Не удалось обновить ${failures} видео. Последние данные сохранены.`
                : null,
            },
          );
          if (!interrupted && !failures)
            completed.set(channel.channelId, {
              channelName: channel.channelName,
              lastSyncedAt: finishedAt,
            });
        } catch {
          await this.sources.update(
            { source: account.source, enabled: true },
            {
              lastError:
                'Канал не обновлён: проверьте ссылку. YouTube также может временно ограничивать доступ.',
            },
          );
        }
      }
    } finally {
      try {
        if (locked) await runner.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_GROUP, 1]);
      } finally {
        await runner.release();
      }
    }
  }

  async pause(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
