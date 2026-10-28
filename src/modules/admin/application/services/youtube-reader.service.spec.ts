/* eslint-disable @typescript-eslint/require-await -- Async client stubs mirror youtubei.js without performing network requests. */
import { ConfigService } from '@nestjs/config';
import { ProxyAgent } from 'undici';
import { validateYoutubeProxyUrl, YoutubeReaderService } from './youtube-reader.service';
import {
  isYoutubeVideoId,
  normalizeYoutubeSource,
  normalizeYoutubeSources,
  youtubeCounterText,
  youtubeThumbnail,
} from './youtube-source';

const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
const videoId = 'LOP8ul3KqQI';

describe('YouTube channel references and public counters', () => {
  it('normalises handles, channel IDs and channel URLs without preserving query parameters', () => {
    expect(normalizeYoutubeSource('@My_Channel')).toBe('https://www.youtube.com/@my_channel');
    expect(normalizeYoutubeSource('https://youtube.com/@My_Channel/shorts?si=test')).toBe(
      'https://www.youtube.com/@my_channel',
    );
    expect(normalizeYoutubeSource(channelId)).toBe(`https://www.youtube.com/channel/${channelId}`);
    expect(normalizeYoutubeSource('youtube.com/user/Example/videos')).toBe(
      'https://www.youtube.com/user/Example',
    );
    expect(normalizeYoutubeSource('@мой_канал')).toBe('https://www.youtube.com/@мой_канал');
    expect(normalizeYoutubeSources(['@Example', 'https://www.youtube.com/@example'])).toHaveLength(
      1,
    );
    expect(normalizeYoutubeSources([])).toEqual([]);
  });

  it.each([
    'http://88.201.210.92/',
    'http://45.9.117.71/',
    'https://127.0.0.1/',
    'https://youtube.com.attacker.example/@channel',
    'https://attacker@youtube.com/@channel',
    'https://youtube.com:444/@channel',
    'https://youtu.be/LOP8ul3KqQI',
    'https://youtube.com/watch?v=LOP8ul3KqQI',
    'https://youtube.com/playlist?list=123',
    'https://youtube.com/@channel/../../watch',
    'https://youtube.com/@%2fprivate',
    'https://youtube.com/@%zz',
    'file:///etc/passwd',
    '',
  ])('rejects non-channel/unsafe reference %s', value => {
    expect(() => normalizeYoutubeSource(value)).toThrow();
  });

  it('enforces input bounds and does not turn missing or rounded counters into false exact values', () => {
    expect(() => normalizeYoutubeSources(new Array(21).fill('@channel'))).toThrow();
    expect(() => normalizeYoutubeSources([null as unknown as string])).toThrow();
    expect(youtubeCounterText(0)).toBe('0');
    expect(youtubeCounterText(undefined)).toBeNull();
    expect(youtubeCounterText(NaN)).toBeNull();
    expect(youtubeCounterText({ toString: () => '1.2K' })).toBe('1.2K');
    expect(youtubeCounterText({})).toBeNull();
    expect(youtubeCounterText('Like')).toBeNull();
    expect(youtubeThumbnail('https://i.ytimg.com/vi/id/hqdefault.jpg')).toContain('i.ytimg.com');
    expect(youtubeThumbnail('https://i.ytimg.com.attacker.example/image')).toBeNull();
    expect(isYoutubeVideoId('../private')).toBe(false);
  });
});

describe('Anonymous YouTube reader', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses an isolated authenticated dispatcher without leaking proxy credentials to YouTube', async () => {
    const config = new ConfigService({
      apiSettings: { YOUTUBE_PROXY_URL: 'http://test-user:test-password@127.0.0.1:8118' },
    });
    const reader = new YoutubeReaderService(config as any);
    const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    try {
      await reader.metadataFetch('https://www.youtube.com/youtubei/v1/browse');
      const options = fetcher.mock.calls[0][1] as RequestInit & { dispatcher: ProxyAgent };
      expect(options.dispatcher).toBeInstanceOf(ProxyAgent);
      expect(new Headers(options.headers).has('proxy-authorization')).toBe(false);
      await expect(reader.metadataFetch('https://45.9.117.71/')).rejects.toThrow('Unsupported');
      fetcher.mockRejectedValueOnce(new Error('proxy unavailable'));
      await expect(reader.metadataFetch('https://www.youtube.com/')).rejects.toThrow(
        'proxy unavailable',
      );
      // No direct retry when the configured proxy is unavailable.
      expect(fetcher).toHaveBeenCalledTimes(2);
      const direct = new YoutubeReaderService();
      fetcher.mockResolvedValueOnce(new Response('{}'));
      await direct.metadataFetch('https://www.youtube.com/');
      expect(fetcher.mock.calls[2][1]).not.toHaveProperty('dispatcher');
    } finally {
      await reader.onModuleDestroy();
    }
  });

  it.each([
    'not-a-url',
    'socks5://localhost:1080',
    'file:///etc/passwd',
    'http://localhost:8118/path',
    'http://localhost:8118/?secret=x',
    'http://localhost:8118/#fragment',
    'http://45.9.117.71:8118',
    'http://[2a01:e5c0:4c8d::2]:8118',
    'http://next-films.ru:8118',
    'https://server.next-films.ru',
  ])('rejects invalid proxy configuration without disclosing credentials: %s', value => {
    expect(() => validateYoutubeProxyUrl(value)).toThrow('Invalid YOUTUBE_PROXY_URL');
  });

  it('accepts HTTP(S) proxies and never includes supplied secrets in errors', () => {
    expect(validateYoutubeProxyUrl(' http://user:pass@127.0.0.1:8118 ')).toBe(
      'http://user:pass@127.0.0.1:8118/',
    );
    expect(validateYoutubeProxyUrl('https://proxy.example:8443')).toBe(
      'https://proxy.example:8443/',
    );
    try {
      validateYoutubeProxyUrl('http://user:private-secret@45.9.117.71:8118');
      throw new Error('should reject');
    } catch (error) {
      expect((error as Error).message).not.toContain('private-secret');
      expect((error as Error).message).toContain('Invalid YOUTUBE_PROXY_URL');
    }
  });

  it('only fetches allowed YouTube hosts, disallows redirects, bounds request time and backs off on throttling', async () => {
    const reader = new YoutubeReaderService();
    const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    for (const url of [
      'http://youtube.com/',
      'https://45.9.117.71/',
      'https://88.201.210.92/',
      'https://localhost/',
      'https://youtube.com.attacker.example/',
      'https://user@youtube.com/',
    ]) {
      await expect(reader.metadataFetch(url)).rejects.toThrow('Unsupported');
    }
    expect(fetcher).not.toHaveBeenCalled();
    await reader.metadataFetch('https://www.youtube.com/youtubei/v1/browse', { method: 'POST' });
    expect(fetcher).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }),
    );
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 429 }));
    await expect(
      reader.metadataFetch('https://www.youtube.com/youtubei/v1/browse'),
    ).rejects.toThrow('temporarily');
    expect(reader.coolingDown).toBe(true);
    await expect(
      reader.metadataFetch('https://www.youtube.com/youtubei/v1/browse'),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('discovers both regular videos and Shorts, deduplicates IDs and ignores playlists', async () => {
    const reader = new YoutubeReaderService();
    const feed = (videos: unknown[]) => ({ videos, has_continuation: false });
    const client = {
      resolveURL: jest.fn().mockResolvedValue({ payload: { browseId: channelId } }),
      getChannel: jest.fn().mockResolvedValue({
        metadata: { external_id: channelId, title: 'Наш канал' },
        has_videos: true,
        has_shorts: true,
        getVideos: async () =>
          feed([
            { id: videoId, title: 'Видео' },
            { content_type: 'PLAYLIST', content_id: 'ABCDEFGHIJK' },
          ]),
        getShorts: async () =>
          feed([
            {
              on_tap_endpoint: { payload: { videoId: 'abcdefghijk' } },
              overlay_metadata: { primary_text: 'Short' },
            },
            { id: videoId },
          ]),
      }),
    };
    jest.spyOn(reader, 'getClient').mockResolvedValue(client as any);
    const result = await reader.readChannel('@our_channel');
    expect(result.channelId).toBe(channelId);
    expect(result.videos.map(video => video.videoId)).toEqual([videoId, 'abcdefghijk']);
    expect(result.videos.every(video => video.isShort)).toBe(true);
    expect(client.resolveURL).toHaveBeenCalledWith('https://www.youtube.com/@our_channel');
  });

  it('bounds paging and detail work to fifty distinct videos per channel', async () => {
    const reader = new YoutubeReaderService();
    const videos = Array.from({ length: 60 }, (_, index) => ({
      id: `video${String(index).padStart(6, '0')}`,
      title: 'video',
    }));
    const getContinuation = jest.fn();
    const client = {
      getChannel: async () => ({
        metadata: { external_id: channelId },
        has_videos: true,
        has_shorts: false,
        getVideos: async () => ({ videos, has_continuation: true, getContinuation }),
      }),
    };
    jest.spyOn(reader, 'getClient').mockResolvedValue(client as any);
    expect((await reader.readChannel(channelId)).videos).toHaveLength(50);
    expect(getContinuation).not.toHaveBeenCalled();
  });

  it('reads descriptions and counters without fetching comment texts when the header has a count', async () => {
    const reader = new YoutubeReaderService();
    const client = {
      getInfo: async () => ({
        basic_info: {
          id: videoId,
          channel_id: channelId,
          title: 'Наш ролик',
          short_description: 'Только описание',
          like_count: 0,
          publish_date: '2026-10-01',
          allow_ratings: true,
        },
        comments_entry_point_header: { comment_count: { toString: () => '1.2K' } },
      }),
      getComments: jest.fn(),
    };
    jest.spyOn(reader, 'getClient').mockResolvedValue(client as any);
    const result = await reader.readVideo(videoId, channelId);
    expect(result).toMatchObject({
      description: 'Только описание',
      likes: '0',
      comments: '1.2K',
      commentsReadFailed: false,
    });
    expect(client.getComments).not.toHaveBeenCalled();
  });

  it('preserves missing/hidden counters as null and distinguishes a failed comments request', async () => {
    const reader = new YoutubeReaderService();
    const client = {
      getInfo: async () => ({
        basic_info: { channel_id: channelId, allow_ratings: false, like_count: 123 },
      }),
      getComments: jest.fn().mockRejectedValue(new Error('comments disabled/unavailable')),
    };
    jest.spyOn(reader, 'getClient').mockResolvedValue(client as any);
    expect(await reader.readVideo(videoId, channelId)).toMatchObject({
      likes: null,
      comments: null,
      commentsReadFailed: true,
    });
  });

  it('will not import a recommended video belonging to a different channel', async () => {
    const reader = new YoutubeReaderService();
    jest.spyOn(reader, 'getClient').mockResolvedValue({
      getInfo: async () => ({ basic_info: { channel_id: 'UCaaaaaaaaaaaaaaaaaaaaaa' } }),
    } as any);
    await expect(reader.readVideo(videoId, channelId)).rejects.toThrow('configured channel');
  });
});
