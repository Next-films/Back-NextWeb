import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { YoutubeSource } from '../../domain/youtube-source.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { ShortContentClientService } from './short-content-client.service';
import { isYoutubeVideoId } from './youtube-source';

/** Only cached, owner-verified Shorts from enabled accounts may reach the media worker. */
@Injectable()
export class YoutubeProcessingService {
  constructor(
    @InjectRepository(YoutubeSource) private readonly sources: Repository<YoutubeSource>,
    @InjectRepository(YoutubeVideo) private readonly videos: Repository<YoutubeVideo>,
    private readonly worker: ShortContentClientService,
  ) {}

  batchStatus() {
    return this.worker.youtubeBatch('GET');
  }

  async configureBatch(input: unknown) {
    const body = input as {
      action?: unknown;
      source?: unknown;
      frameId?: unknown;
      contentConfirmed?: unknown;
    } | null;
    if (body?.action === 'pause' || body?.action === 'resume')
      return this.worker.youtubeBatch('POST', { action: body.action });
    if (
      body?.action !== 'start' ||
      body.contentConfirmed !== true ||
      !(
        body.frameId === null ||
        body.frameId === 'shortkino-v2' ||
        (typeof body.frameId === 'string' && /^[a-f0-9]{64}$/.test(body.frameId))
      ) ||
      (body.source !== undefined && (typeof body.source !== 'string' || body.source.length > 300))
    )
      throw new BadRequestException('Подтвердите пакетную обработку Shorts и выберите рамку');
    const sources = await this.sources.find({
      where: { enabled: true, ...(body.source ? { source: body.source } : {}) },
    });
    const channelIds = [
      ...new Set(sources.map(source => source.channelId).filter((id): id is string => !!id)),
    ];
    if (!channelIds.length) throw new BadRequestException('Нет доступных каналов');
    const videos = await this.videos.find({
      where: {
        channelId: In(channelIds),
        isShort: true,
        downloadStatus: 'downloaded',
        lastSyncedAt: Not(IsNull()),
      },
      select: { videoId: true },
      order: { publishedAt: 'DESC', firstSeenAt: 'DESC', videoId: 'ASC' },
      take: 10000,
    });
    if (!videos.length) throw new BadRequestException('Нет скачанных Shorts для обработки');
    return this.worker.youtubeBatch('POST', {
      action: 'start',
      contentConfirmed: true,
      frameId: body.frameId,
      videoIds: videos.map(video => video.videoId),
    });
  }

  async libraryStatuses<T extends { videos: YoutubeVideo[] }>(overview: T) {
    if (!overview.videos.length) return overview;
    try {
      const statuses = await this.worker.youtubeStatuses(
        overview.videos.map(video => video.videoId),
      );
      const byId = new Map(statuses.map(status => [status.videoId, status]));
      return {
        ...overview,
        videos: overview.videos.map(video => ({
          ...video,
          processing: byId.get(video.videoId) ?? null,
        })),
      };
    } catch {
      return { ...overview, processingUnavailable: true };
    }
  }

  frames() {
    return this.worker.youtubeFrames();
  }

  uploadFrame(file: Express.Multer.File | undefined) {
    if (
      !file ||
      file.mimetype !== 'image/png' ||
      !Buffer.isBuffer(file.buffer) ||
      file.buffer.length > 10 * 1024 ** 2 ||
      file.buffer.length < 33 ||
      !file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new BadRequestException('Загрузите PNG-рамку до 10 МБ');
    return this.worker.uploadYoutubeFrame(file.buffer);
  }

  frameAsset(id: string) {
    if (id !== 'shortkino-v2' && !/^[a-f0-9]{64}$/.test(id))
      throw new BadRequestException('Invalid frame ID');
    return this.worker.youtubeFrameAsset(id);
  }

  private async eligible(videoId: string) {
    if (!isYoutubeVideoId(videoId)) throw new BadRequestException('Invalid YouTube video ID');
    const video = await this.videos.findOneBy({ videoId });
    if (!video) throw new NotFoundException('Video not found');
    if (video.isShort !== true || !video.lastSyncedAt)
      throw new BadRequestException(
        'Only owner-verified Shorts may be downloaded. Refresh the channel first.',
      );
    const source = await this.sources.findOneBy({ channelId: video.channelId, enabled: true });
    if (!source) throw new NotFoundException('Enabled channel not found');
    return { video, source };
  }

  async status(videoId: string) {
    await this.eligible(videoId);
    return this.worker.youtubeRequest('GET', videoId);
  }

  async remove(videoId: string) {
    await this.eligible(videoId);
    const result = await this.worker.youtubeRequest('DELETE', videoId);
    await this.videos.update(
      { videoId },
      {
        downloadStatus: 'skipped',
        downloadError: 'Файлы удалены вручную; автоскачивание для ролика пропущено.',
      },
    );
    return result;
  }

  async download(videoId: string, input: unknown) {
    const { video, source } = await this.eligible(videoId);
    const body = input as { contentConfirmed?: unknown; downloadOnly?: unknown } | null;
    if (body?.contentConfirmed !== true)
      throw new BadRequestException('Confirm this Short is a movie clip you may process');
    const result = await this.worker.youtubeRequest('POST', videoId, {
      channelId: video.channelId,
      isShort: true,
      contentConfirmed: true,
      downloadOnly: body.downloadOnly === true,
      keywords: [
        'КиноДок',
        'MovieDocRU',
        source.channelName ?? '',
        source.source.split('/').at(-1) ?? '',
      ]
        .filter(Boolean)
        .map(word => word.slice(0, 100)),
    });
    if (body.downloadOnly !== true)
      await this.videos.update(
        { videoId },
        {
          downloadStatus: 'queued',
          downloadAttempts: 0,
          downloadError: null,
          downloadRetryAt: null,
          downloadUpdatedAt: new Date(),
        },
      );
    return result;
  }

  async render(videoId: string, input: unknown) {
    await this.eligible(videoId);
    return this.worker.youtubeRequest('POST', videoId, input, 'render');
  }

  async asset(videoId: string, kind: string) {
    await this.eligible(videoId);
    if (!['original', 'processed'].includes(kind))
      throw new BadRequestException('Invalid artifact');
    return this.worker.youtubeAsset(videoId, kind);
  }
}
