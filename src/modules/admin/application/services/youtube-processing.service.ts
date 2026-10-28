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
    return this.worker.youtubeRequest('DELETE', videoId);
  }

  async download(videoId: string, input: unknown) {
    const { video, source } = await this.eligible(videoId);
    const body = input as { contentConfirmed?: unknown } | null;
    if (body?.contentConfirmed !== true)
      throw new BadRequestException('Confirm this Short is a movie clip you may process');
    return this.worker.youtubeRequest('POST', videoId, {
      channelId: video.channelId,
      isShort: true,
      contentConfirmed: true,
      keywords: [
        'КиноДок',
        'MovieDocRU',
        source.channelName ?? '',
        source.source.split('/').at(-1) ?? '',
      ].filter(Boolean),
    });
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
