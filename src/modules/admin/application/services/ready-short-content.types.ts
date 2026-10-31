import type { YoutubeVideo } from '../../domain/youtube-video.entity';
import type { ShortContentType } from '../../domain/short-content-job.entity';

export type ReadyEngineClip =
  | {
      source: 'library';
      engineJobId: string;
      clipIndex: number;
      revision: number;
      durationSec: number;
      updatedAt: string;
      title?: string;
      hook?: string;
      videoUrl: string;
      downloadUrl: string;
    }
  | {
      source: 'youtube';
      videoId: string;
      channelId: string;
      revision: number;
      durationSec: number;
      updatedAt: string;
      reviewRequired: boolean;
    };

export type ReadyShelfItem = {
  id: string;
  title: string;
  updatedAt: string;
  durationSec: number;
  revision: number;
  reviewRequired: boolean;
} & (
  | {
      source: 'library';
      jobId: number;
      clipIndex: number;
      contentType: ShortContentType;
      videoUrl: string;
      downloadUrl: string;
      hook?: string;
    }
  | {
      source: 'youtube';
      channelName: string;
      video: Pick<
        YoutubeVideo,
        | 'videoId'
        | 'channelId'
        | 'title'
        | 'description'
        | 'thumbnailUrl'
        | 'isShort'
        | 'publishedAt'
        | 'likes'
        | 'comments'
        | 'commentsUpdatedAt'
        | 'lastSyncedAt'
      > & {
        lastError: null;
        processing: {
          videoId: string;
          status: 'done';
          revision: number;
          processedAvailable: true;
          reviewRequired: boolean;
        };
      };
    }
);
