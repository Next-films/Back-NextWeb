import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminCreateShortContentHighlightsInputDto } from '@/admin/api/dtos/input/admin-create-short-content-highlights.input.dto';
import { AdminUpdateShortContentClipMusicInputDto } from '@/admin/api/dtos/input/admin-update-short-content-clip-music.input.dto';
import { AdminUploadShortContentMusicInputDto } from '@/admin/api/dtos/input/admin-upload-short-content-music.input.dto';
import { AdminUpdateShortContentSettingsInputDto } from '@/admin/api/dtos/input/admin-update-short-content-settings.input.dto';
import { AdminShortContentLogoInputDto } from '@/admin/api/dtos/input/admin-short-content-logo.input.dto';
import { AdminShortContentFeedbackInputDto } from '@/admin/api/dtos/input/admin-short-content-feedback.input.dto';

/** A highlights job of the short-content service (see its README). */
export type ShortContentEngineJob = Record<string, unknown> & {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  title?: string;
  error?: string;
};

export type ShortContentReprocessing = Record<string, unknown> & {
  status: 'idle' | 'running' | 'completed';
  updatedJobs?: Record<string, string>;
};

@Injectable()
export class ShortContentClientService {
  constructor(private readonly configService: ConfigService<ConfigurationType, true>) {}

  youtubeQueue(): Promise<Record<string, unknown>> {
    return this.call('GET', '/api/shorts/youtube-queue');
  }

  youtubeBatch(method: 'GET' | 'POST', body?: unknown): Promise<Record<string, unknown>> {
    return this.call(method, '/api/shorts/youtube-batch', body);
  }

  youtubeStatuses(videoIds: string[]): Promise<Array<Record<string, unknown>>> {
    return this.call('POST', '/api/shorts/youtube-statuses', { videoIds });
  }

  youtubePublishingUrl(assetId: string): Promise<{ url: string }> {
    if (!/^[a-f0-9]{64}$/.test(assetId))
      throw new ServiceUnavailableException('Invalid publishing asset');
    return this.call('GET', `/api/shorts/youtube-publishing/${assetId}/url`);
  }

  deleteYoutubePublication(
    assetId: string,
    input: { videoId: string; revision: number; sourceRevision: number; removeSource: boolean },
  ): Promise<{ removed: boolean; sourceRemoved: boolean }> {
    if (!/^[a-f0-9]{64}$/.test(assetId))
      throw new ServiceUnavailableException('Invalid publishing asset');
    return this.call('DELETE', `/api/shorts/youtube-publishing/${assetId}`, input);
  }

  youtubeFrames(): Promise<Record<string, unknown>[]> {
    return this.call('GET', '/api/shorts/youtube-frames');
  }

  async uploadYoutubeFrame(data: Buffer): Promise<Record<string, unknown>> {
    const settings = this.configService.get('apiSettings', { infer: true });
    if (!settings.SHORT_CONTENT_SERVICE_URL?.trim())
      throw new ServiceUnavailableException('Short-content is not configured');
    const response = await fetch(
      new URL('/api/shorts/youtube-frames', settings.SHORT_CONTENT_SERVICE_URL),
      {
        method: 'POST',
        headers: {
          ...this.buildHeaders(settings.SHORT_CONTENT_SERVICE_TOKEN, false),
          'Content-Type': 'image/png',
        },
        body: data,
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceUnavailableException(
        'Не удалось сохранить рамку: проверьте PNG, размер, формат 9:16 и доступное место.',
      );
    }
    return response.json() as Promise<Record<string, unknown>>;
  }

  async youtubeFrameAsset(frameId: string): Promise<Response> {
    const settings = this.configService.get('apiSettings', { infer: true });
    if (!settings.SHORT_CONTENT_SERVICE_URL?.trim())
      throw new ServiceUnavailableException('Short-content is not configured');
    const response = await fetch(
      new URL(
        `/api/shorts/youtube-frames/${encodeURIComponent(frameId)}`,
        settings.SHORT_CONTENT_SERVICE_URL,
      ),
      {
        headers: this.buildHeaders(settings.SHORT_CONTENT_SERVICE_TOKEN, false),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new ServiceUnavailableException('Рамка недоступна');
    }
    return response;
  }

  youtubeRequest(
    method: 'GET' | 'POST' | 'DELETE',
    videoId: string,
    body?: unknown,
    action = '',
  ): Promise<Record<string, unknown>> {
    return this.call(
      method,
      `/api/shorts/youtube/${encodeURIComponent(videoId)}${action ? `/${action}` : ''}`,
      body,
    );
  }

  async youtubeAsset(videoId: string, kind: string): Promise<Response> {
    const settings = this.configService.get('apiSettings', { infer: true });
    if (!settings.SHORT_CONTENT_SERVICE_URL?.trim())
      throw new ServiceUnavailableException('Short-content is not configured');
    const response = await fetch(
      new URL(
        `/api/shorts/youtube/${encodeURIComponent(videoId)}/files/${kind}`,
        this.ensureTrailingSlash(settings.SHORT_CONTENT_SERVICE_URL),
      ),
      {
        headers: this.buildHeaders(settings.SHORT_CONTENT_SERVICE_TOKEN, false),
        redirect: 'error',
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new ServiceUnavailableException('YouTube artifact is not available yet');
    }
    return response;
  }

  createHighlights(
    input: AdminCreateShortContentHighlightsInputDto,
  ): Promise<ShortContentEngineJob> {
    return this.call('POST', '/api/shorts/highlights', input);
  }

  /** Does the title have our own video, and which seasons/episodes can be cut. */
  getSources(contentType: string, contentId: number): Promise<Record<string, unknown>> {
    return this.call('GET', `/api/shorts/sources/${encodeURIComponent(contentType)}/${contentId}`);
  }

  getHighlights(engineJobId: string): Promise<ShortContentEngineJob> {
    return this.call('GET', `/api/shorts/highlights/${encodeURIComponent(engineJobId)}`);
  }

  reselectHighlights(engineJobId: string): Promise<ShortContentEngineJob> {
    return this.call(
      'POST',
      `/api/shorts/highlights/${encodeURIComponent(engineJobId)}/reselect`,
      {},
    );
  }

  setClipFeedback(
    engineJobId: string,
    clipIndex: number,
    input: AdminShortContentFeedbackInputDto,
  ): Promise<ShortContentEngineJob> {
    return this.call(
      'PATCH',
      `/api/shorts/highlights/${encodeURIComponent(engineJobId)}/clips/${clipIndex}/feedback`,
      input,
    );
  }

  getMusicTracks(): Promise<Record<string, unknown>[]> {
    return this.call('GET', '/api/shorts/music-tracks');
  }

  getSettings(): Promise<Record<string, unknown>> {
    return this.call('GET', '/api/shorts/settings');
  }

  getReprocessing(): Promise<ShortContentReprocessing> {
    return this.call('GET', '/api/shorts/reprocessing');
  }

  rebuildReadyClips(): Promise<ShortContentReprocessing> {
    return this.call('POST', '/api/shorts/reprocessing', { mode: 'settings' });
  }

  updateLogoSettings(input: AdminShortContentLogoInputDto): Promise<Record<string, unknown>> {
    return this.call('PATCH', '/api/shorts/settings/logo', input);
  }

  updateClipLogo(
    engineJobId: string,
    clipIndex: number,
    input: AdminShortContentLogoInputDto,
  ): Promise<ShortContentEngineJob> {
    return this.call(
      'PATCH',
      `/api/shorts/highlights/${encodeURIComponent(engineJobId)}/clips/${clipIndex}/logo`,
      input,
    );
  }

  updateSettings(input: AdminUpdateShortContentSettingsInputDto): Promise<Record<string, unknown>> {
    return this.call('PATCH', '/api/shorts/settings', input);
  }

  async uploadMusicTrack(
    file: Express.Multer.File,
    input: AdminUploadShortContentMusicInputDto,
  ): Promise<Record<string, unknown>> {
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const serviceUrl = apiSettings.SHORT_CONTENT_SERVICE_URL?.trim();

    if (!serviceUrl) {
      throw new ServiceUnavailableException('SHORT_CONTENT_SERVICE_URL is not configured');
    }

    const query = new URLSearchParams({
      title: input.title,
      moods: input.moods ?? '',
      energy: String(input.energy),
      genres: input.genres ?? '',
      keywords: input.keywords ?? '',
      fileName: file.originalname,
      mimeType: file.mimetype,
    });
    const headers = this.buildHeaders(apiSettings.SHORT_CONTENT_SERVICE_TOKEN, false);
    headers['Content-Type'] = 'application/octet-stream';
    const response = await fetch(
      new URL(`/api/shorts/music-tracks?${query}`, this.ensureTrailingSlash(serviceUrl)),
      {
        method: 'POST',
        headers,
        body: file.buffer,
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new ServiceUnavailableException(
        `short-content POST /api/shorts/music-tracks failed: ${response.status} ${response.statusText} ${errorText}`,
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }

  updateClipMusic(
    engineJobId: string,
    clipIndex: number,
    input: AdminUpdateShortContentClipMusicInputDto,
  ): Promise<ShortContentEngineJob> {
    return this.call(
      'PATCH',
      `/api/shorts/highlights/${encodeURIComponent(engineJobId)}/clips/${clipIndex}/music`,
      input,
      [],
      120_000,
    );
  }

  /** Removes the job and its clips from the service; an already missing job is fine. */
  async deleteHighlights(engineJobId: string): Promise<void> {
    await this.call(
      'DELETE',
      `/api/shorts/highlights/${encodeURIComponent(engineJobId)}`,
      undefined,
      [404],
    );
  }

  /** Removes one rendered clip; an already missing clip is considered cleaned up. */
  async deleteHighlightClip(engineJobId: string, clipIndex: number): Promise<void> {
    await this.call(
      'DELETE',
      `/api/shorts/highlights/${encodeURIComponent(engineJobId)}/clips/${encodeURIComponent(
        String(clipIndex),
      )}`,
      undefined,
      [404],
    );
  }

  private async call<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    okStatuses: number[] = [],
    timeoutMs = 30_000,
  ): Promise<T> {
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const serviceUrl = apiSettings.SHORT_CONTENT_SERVICE_URL?.trim();

    if (!serviceUrl) {
      throw new ServiceUnavailableException('SHORT_CONTENT_SERVICE_URL is not configured');
    }

    const response = await fetch(new URL(path, this.ensureTrailingSlash(serviceUrl)), {
      method,
      headers: this.buildHeaders(apiSettings.SHORT_CONTENT_SERVICE_TOKEN, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok && !okStatuses.includes(response.status)) {
      const errorText = await response.text();

      throw new ServiceUnavailableException(
        `short-content ${method} ${path} failed: ${response.status} ${response.statusText} ${errorText}`,
      );
    }

    return (
      response.status === 204 || okStatuses.includes(response.status)
        ? undefined
        : await response.json()
    ) as T;
  }

  private buildHeaders(token: string, hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    // Fastify rejects a JSON content type on a request without a body (400).
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (token?.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    return headers;
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
