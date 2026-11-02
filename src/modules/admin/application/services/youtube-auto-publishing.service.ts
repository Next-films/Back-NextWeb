import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { SocialPublishingRule } from '../../domain/social-publishing-rule.entity';
import { SocialYoutubeClip } from '../../domain/social-youtube-clip.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { YoutubeSource } from '../../domain/youtube-source.entity';
import { ShortContentClientService } from './short-content-client.service';
import { SocialPublishingService } from './social-publishing.service';

/** Owner-opted-in enrollment only; the existing publisher alone controls schedule/submission. */
@Injectable()
export class YoutubeAutoPublishingService {
  private running = false;
  private readonly failedUntil = new Map<string, number>();

  constructor(
    private readonly database: DataSource,
    private readonly worker: ShortContentClientService,
    private readonly publishing: SocialPublishingService,
    private readonly logger: LoggerService,
  ) {}

  @Cron('30 * * * * *')
  async tick(): Promise<void> {
    try {
      await this.syncReadyClips();
    } catch {
      this.logger.warn(
        'YouTube auto-enrollment deferred; existing schedule and files preserved.',
        YoutubeAutoPublishingService.name,
      );
    }
  }

  async syncReadyClips() {
    const result = { added: 0, failed: 0, pending: 0 };
    if (this.running) return result;
    this.running = true;
    const runner = this.database.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      locked =
        (await runner.query('SELECT pg_try_advisory_lock($1,$2) AS locked', [1793200000, 8]))[0]
          ?.locked === true;
      if (!locked) return result;
      const rules = await this.database
        .getRepository(SocialPublishingRule)
        .find({ where: { isEnabled: true, autoEnqueueYoutube: true, pausedByFailure: false } });
      if (
        !rules.some(
          rule =>
            rule.sourceGroups?.includes('youtube') && (!rule.endAt || rule.endAt > new Date()),
        )
      )
        return result;
      if (
        await this.database
          .getRepository(SocialPublishingRule)
          .exist({ where: { pausedByFailure: true } })
      )
        return result;
      const inventory = await this.worker.readyClips();
      if (!Array.isArray(inventory?.clips)) throw new Error('Ready inventory unavailable');
      const known = new Set(
        (
          await this.database.getRepository(SocialYoutubeClip).find({ select: { videoId: true } })
        ).map(clip => clip.videoId),
      );
      const sources = new Set(
        (await this.database.getRepository(YoutubeSource).find({ where: { enabled: true } })).map(
          source => source.channelId,
        ),
      );
      const candidates = inventory.clips
        .filter(
          clip =>
            clip.source === 'youtube' && !known.has(clip.videoId) && sources.has(clip.channelId),
        )
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      let attempted = 0;
      for (const clip of candidates) {
        if (clip.source !== 'youtube' || known.has(clip.videoId)) continue;
        const key = `${clip.videoId}:${clip.revision}`;
        if ((this.failedUntil.get(key) ?? 0) > Date.now()) {
          result.pending++;
          continue;
        }
        const video = await this.database
          .getRepository(YoutubeVideo)
          .findOneBy({ videoId: clip.videoId });
        if (
          !video ||
          video.isShort !== true ||
          !video.lastSyncedAt ||
          video.downloadStatus !== 'downloaded' ||
          video.channelId !== clip.channelId
        )
          continue;
        if (attempted >= 25) {
          result.pending++;
          continue;
        }
        attempted++;
        try {
          await this.publishing.enqueueAutomaticYoutube(clip.videoId, clip.revision);
          known.add(clip.videoId);
          this.failedUntil.delete(key);
          result.added++;
        } catch {
          // A stale revision, missing MP4 or invalid mask is not permission to publish another file.
          result.failed++;
          this.failedUntil.set(key, Date.now() + 5 * 60_000);
        }
      }
      return result;
    } finally {
      try {
        if (locked) await runner.query('SELECT pg_advisory_unlock($1,$2)', [1793200000, 8]);
      } finally {
        this.running = false;
        await runner.release();
      }
    }
  }
}
