import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
