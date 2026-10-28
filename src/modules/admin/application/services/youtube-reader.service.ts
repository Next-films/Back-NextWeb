import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProxyAgent } from 'undici';
import type { Innertube } from 'youtubei.js';
import type { ConfigurationType } from '@/settings/configuration';
import { loadYoutube } from './youtube-esm.cjs';
import {
  isYoutubeChannelId,
  isYoutubeVideoId,
  normalizeYoutubeSource,
  youtubeCounterText,
  youtubeThumbnail,
} from './youtube-source';

export type YoutubeListedVideo = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  isShort: boolean;
};
export type YoutubeChannelPage = {
  channelId: string;
  channelName: string;
  videos: YoutubeListedVideo[];
};
export type YoutubeVideoDetails = {
  videoId: string;
  channelId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  likes: string | null;
  comments: string | null;
  commentsReadFailed: boolean;
};
type Feed = {
  videos: readonly unknown[];
  has_continuation: boolean;
  getContinuation(): Promise<Feed>;
};
export class YoutubeVideoOwnerError extends Error {}
const MAX_VIDEOS = 50;

/** Operator-only setting. Invalid config must fail closed, never fall back to a direct request. */
export function validateYoutubeProxyUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Invalid YOUTUBE_PROXY_URL');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    [
      '45.9.117.71',
      '2a01:e5c0:4c8d::2',
      'next-films.ru',
      'www.next-films.ru',
      'server.next-films.ru',
    ].includes(host)
  ) {
    throw new Error('Invalid YOUTUBE_PROXY_URL: public cinema cannot be a proxy');
  }
  return url.href;
}

/** Metadata only, anonymous, no Google key, credentials, player code or video downloads. */
@Injectable()
export class YoutubeReaderService implements OnModuleDestroy {
  private session: Promise<Innertube> | null = null;
  private blockedUntil = 0;
  private proxyAgent: ProxyAgent | undefined;

  constructor(
    @Optional() private readonly configService?: ConfigService<ConfigurationType, true>,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.proxyAgent?.close();
  }

  private dispatcher(): ProxyAgent | undefined {
    const value = this.configService?.get('apiSettings', { infer: true }).YOUTUBE_PROXY_URL.trim();
    if (!value) return undefined;
    // Per-reader dispatcher only. Do not set HTTP_PROXY or the global Node dispatcher.
    this.proxyAgent ??= new ProxyAgent(validateYoutubeProxyUrl(value));
    return this.proxyAgent;
  }

  get coolingDown(): boolean {
    return Date.now() < this.blockedUntil;
  }

  async getClient(): Promise<Innertube> {
    if (this.coolingDown) throw new Error('YouTube temporarily unavailable');
    if (!this.session) {
      this.session = this.createClient().catch(error => {
        this.session = null;
        throw error;
      });
    }
    return this.session;
  }

  private async createClient(): Promise<Innertube> {
    const { Innertube: Client } = await loadYoutube();
    return Client.create({
      lang: 'en',
      location: 'US',
      retrieve_player: false,
      generate_session_locally: true,
      enable_session_cache: false,
      fetch: (input, init) =>
        this.metadataFetch(input as string | URL | Request, init as RequestInit),
    });
  }

  /** Refuse peer servers/arbitrary destinations and redirects, even if supplied by an upstream response. */
  async metadataFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? String(input) : input.url,
    );
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtubei.googleapis.com'].includes(
        url.hostname,
      )
    ) {
      throw new Error('Unsupported YouTube metadata endpoint');
    }
    if (this.coolingDown) throw new Error('YouTube temporarily unavailable');
    const options: RequestInit & { dispatcher?: ProxyAgent } = {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    };
    const dispatcher = this.dispatcher();
    if (dispatcher) options.dispatcher = dispatcher;
    const response = await fetch(input, options);
    if ([403, 429].includes(response.status)) {
      this.blockedUntil = Date.now() + 30 * 60_000;
      await response.body?.cancel();
      throw new Error('YouTube temporarily unavailable');
    }
    return response;
  }

  async readChannel(source: string): Promise<YoutubeChannelPage> {
    const normalized = normalizeYoutubeSource(source);
    const client = await this.getClient();
    const directId = normalized.match(/\/channel\/(UC[A-Za-z0-9_-]{22})$/)?.[1];
    const channelId: unknown = directId ?? (await client.resolveURL(normalized)).payload?.browseId;
    if (!isYoutubeChannelId(channelId)) throw new Error('YouTube channel could not be resolved');
    const channel = await client.getChannel(channelId);
    if (channel.metadata.external_id && channel.metadata.external_id !== channelId)
      throw new Error('Unexpected YouTube channel');
    const feeds: YoutubeListedVideo[][] = [];
    if (channel.has_videos)
      feeds.push(await this.readFeed((await channel.getVideos()) as unknown as Feed, false));
    if (channel.has_shorts)
      feeds.push(await this.readFeed((await channel.getShorts()) as unknown as Feed, true));
    // Interleave regular videos and Shorts, so neither format hides the other.
    const videos = new Map<string, YoutubeListedVideo>();
    for (let index = 0; index < MAX_VIDEOS && videos.size < MAX_VIDEOS; index++) {
      for (const feed of feeds) {
        const video = feed[index];
        if (video && (videos.has(video.videoId) || videos.size < MAX_VIDEOS)) {
          const previous = videos.get(video.videoId);
          videos.set(video.videoId, {
            ...video,
            isShort: video.isShort || previous?.isShort === true,
          });
        }
      }
    }
    return {
      channelId,
      channelName: (channel.metadata.title || channelId).slice(0, 500),
      videos: [...videos.values()],
    };
  }

  async readShortsArchivePage(
    channelId: string,
    token: string | null,
  ): Promise<{ videos: YoutubeListedVideo[]; nextToken: string | null }> {
    if (
      !isYoutubeChannelId(channelId) ||
      (token !== null && (typeof token !== 'string' || token.length > 20000))
    )
      throw new Error('Invalid archive cursor');
    const client = await this.getClient();
    const { Mixins, YTNodes } = await loadYoutube();
    let feed: InstanceType<typeof Mixins.Feed>;
    if (token) {
      const data = await client.actions.execute('/browse', { continuation: token, parse: true });
      feed = new Mixins.Feed(client.actions, data, true);
    } else {
      const channel = await client.getChannel(channelId);
      if (channel.metadata.external_id && channel.metadata.external_id !== channelId)
        throw new Error('Unexpected channel');
      if (!channel.has_shorts) return { videos: [], nextToken: null };
      feed = await channel.getShorts();
    }
    const headers = new Set<unknown>(
      feed.page.header_memo?.getType(YTNodes.ContinuationItem, YTNodes.ContinuationItemView) ?? [],
    );
    const continuation = feed.memo
      .getType(YTNodes.ContinuationItem, YTNodes.ContinuationItemView)
      .find(item => !headers.has(item));
    const payload = continuation?.endpoint.payload;
    const next: unknown = payload?.continuation ?? payload?.token;
    if (feed.has_continuation && (typeof next !== 'string' || !next || next.length > 20000))
      throw new Error('Cannot safely resume the Shorts archive');
    return {
      videos: await this.readFeed(feed as unknown as Feed, true, 1, 500),
      nextToken: typeof next === 'string' ? next : null,
    };
  }

  private async readFeed(
    first: Feed,
    isShort: boolean,
    pageLimit = 3,
    videoLimit = MAX_VIDEOS,
  ): Promise<YoutubeListedVideo[]> {
    let feed = first;
    const videos = new Map<string, YoutubeListedVideo>();
    for (let page = 0; page < pageLimit; page++) {
      for (const value of feed.videos) {
        const node = value as Record<string, any>;
        if (node.content_type && !['VIDEO', 'SHORT'].includes(node.content_type)) continue;
        const id: unknown =
          node.id ?? node.video_id ?? node.content_id ?? node.on_tap_endpoint?.payload?.videoId;
        if (!isYoutubeVideoId(id)) continue;
        const title = node.title ?? node.overlay_metadata?.primary_text ?? node.metadata?.title;
        const thumbnails = node.thumbnails ?? node.thumbnail ?? node.content_image?.image;
        const thumbnail = Array.isArray(thumbnails) ? thumbnails.at(-1)?.url : undefined;
        videos.set(id, {
          videoId: id,
          title: (title ? String(title) : 'Видео').slice(0, 500),
          thumbnailUrl: youtubeThumbnail(thumbnail),
          isShort,
        });
        if (videos.size >= videoLimit) break;
      }
      if (videos.size >= videoLimit || !feed.has_continuation || page + 1 >= pageLimit) break;
      feed = await feed.getContinuation();
    }
    return [...videos.values()];
  }

  async readVideo(videoId: string, channelId: string): Promise<YoutubeVideoDetails> {
    if (!isYoutubeVideoId(videoId) || !isYoutubeChannelId(channelId))
      throw new Error('Invalid YouTube identifier');
    const client = await this.getClient();
    const info = await client.getInfo(videoId);
    const basic = info.basic_info;
    // Never silently import recommended videos belonging to a different owner.
    if ((basic.channel_id && basic.channel_id !== channelId) || (basic.id && basic.id !== videoId))
      throw new YoutubeVideoOwnerError('Video does not belong to configured channel');
    if (!basic.channel_id) throw new Error('Video owner unavailable');
    let comments = youtubeCounterText(info.comments_entry_point_header?.comment_count);
    let commentsReadFailed = false;
    if (comments === null) {
      try {
        const section = await client.getComments(videoId);
        comments = youtubeCounterText(section.header?.comments_count);
      } catch {
        commentsReadFailed = true;
      }
    }
    const published = basic.publish_date ?? basic.upload_date;
    const publishedAt = published ? new Date(published) : null;
    const displayedLikes = info.primary_info?.menu?.top_level_buttons
      ?.map(button =>
        youtubeCounterText((button as unknown as { short_like_count?: string }).short_like_count),
      )
      .find(value => value !== null);
    return {
      videoId,
      channelId,
      title: (basic.title || 'Видео').slice(0, 500),
      description:
        typeof basic.short_description === 'string'
          ? basic.short_description.slice(0, 20000)
          : null,
      thumbnailUrl: youtubeThumbnail(basic.thumbnail?.at(-1)?.url),
      publishedAt: publishedAt && Number.isFinite(publishedAt.getTime()) ? publishedAt : null,
      likes:
        basic.allow_ratings === false
          ? null
          : displayedLikes ?? youtubeCounterText(basic.like_count),
      comments,
      commentsReadFailed,
    };
  }
}
