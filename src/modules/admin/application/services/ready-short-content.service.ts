import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { ShortContentJobRepository } from '../../infrastructure/short-content-job.repository';
import { ShortContentJobStatus } from '../../domain/short-content-job.entity';
import { YoutubeVideo } from '../../domain/youtube-video.entity';
import { YoutubeSource } from '../../domain/youtube-source.entity';
import { ShortContentClientService } from './short-content-client.service';
import { AdminReadyShortContentQueryDto } from '../../api/dtos/input/admin-ready-short-content.input.dto';
import { ReadyShelfItem } from './ready-short-content.types';

/** A read-only shelf, NOT a publishing approval or an automatic enqueue operation. */
@Injectable()
export class ReadyShortContentService {
  constructor(
    private readonly worker: ShortContentClientService,
    private readonly jobs: ShortContentJobRepository,
    @InjectRepository(YoutubeVideo) private readonly videos: Repository<YoutubeVideo>,
    @InjectRepository(YoutubeSource) private readonly sources: Repository<YoutubeSource>,
  ) {}

  async list(query: AdminReadyShortContentQueryDto) {
    const [inventory, jobs, sources] = await Promise.all([
      this.worker.readyClips(),
      this.jobs.findAll(),
      this.sources.find({ where: { enabled: true } }),
    ]);
    if (!Array.isArray(inventory?.clips))
      throw new ServiceUnavailableException('Список готовых файлов временно недоступен');
    const jobMap = new Map(
      jobs
        .filter(job => job.shortContentJobId && job.status !== ShortContentJobStatus.REJECTED)
        .map(job => [job.shortContentJobId!, job]),
    );
    const channelMap = new Map(sources.filter(s => s.channelId).map(s => [s.channelId!, s]));
    const ids = [
      ...new Set(inventory.clips.flatMap(c => (c.source === 'youtube' ? [c.videoId] : []))),
    ];
    const videos =
      ids.length && channelMap.size
        ? await this.videos.find({
            where: {
              videoId: In(ids),
              channelId: In([...channelMap.keys()]),
              isShort: true,
              lastSyncedAt: Not(IsNull()),
              downloadStatus: 'downloaded',
            },
          })
        : [];
    const videoMap = new Map(videos.map(video => [video.videoId, video]));
    const items = inventory.clips.flatMap<ReadyShelfItem>(clip => {
      if (clip.source === 'library') {
        const job = jobMap.get(clip.engineJobId);
        if (!job) return [];
        return [
          {
            id: `library:${job.id}:${clip.clipIndex}`,
            source: 'library' as const,
            title: job.contentTitle || clip.title || `Нарезка ${job.id}`,
            updatedAt: clip.updatedAt,
            durationSec: clip.durationSec,
            revision: clip.revision,
            reviewRequired: false,
            jobId: job.id,
            clipIndex: clip.clipIndex,
            contentType: job.contentType,
            videoUrl: clip.videoUrl,
            downloadUrl: clip.downloadUrl,
            hook: clip.hook,
          },
        ];
      }
      const video = videoMap.get(clip.videoId);
      if (
        !video ||
        video.channelId !== clip.channelId ||
        video.isShort !== true ||
        !video.lastSyncedAt ||
        video.downloadStatus !== 'downloaded'
      )
        return [];
      const channel = channelMap.get(video.channelId);
      if (!channel) return [];
      return [
        {
          id: `youtube:${video.videoId}:${clip.revision}`,
          source: 'youtube' as const,
          title: video.title,
          updatedAt: clip.updatedAt,
          durationSec: clip.durationSec,
          revision: clip.revision,
          reviewRequired: clip.reviewRequired,
          channelName: channel.channelName || channel.source,
          video: {
            videoId: video.videoId,
            channelId: video.channelId,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            isShort: video.isShort,
            publishedAt: video.publishedAt,
            likes: video.likes,
            comments: video.comments,
            commentsUpdatedAt: video.commentsUpdatedAt,
            lastSyncedAt: video.lastSyncedAt,
            lastError: null,
            processing: {
              videoId: video.videoId,
              status: 'done' as const,
              revision: clip.revision,
              processedAvailable: true,
              reviewRequired: clip.reviewRequired,
            },
          },
        },
      ];
    });
    // Filter the complete, verified inventory BEFORE slicing pages or counting totals.
    const search = query.search?.trim().toLocaleLowerCase() ?? '';
    const filtered = items.filter(
      item =>
        (!search || item.title.toLocaleLowerCase().includes(search)) &&
        (query.review === 'all' ||
          (query.review === 'pending' ? item.reviewRequired : !item.reviewRequired)),
    );
    const counts = {
      library: filtered.filter(i => i.source === 'library').length,
      youtube: filtered.filter(i => i.source === 'youtube').length,
    };
    const selected = filtered
      .filter(item => query.source === 'all' || item.source === query.source)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return {
      items: selected.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
      total: selected.length,
      page: query.page,
      pageSize: query.pageSize,
      counts,
    };
  }
}
