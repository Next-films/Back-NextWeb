import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminCreateShortContentHighlightsInputDto } from '@/admin/api/dtos/input/admin-create-short-content-highlights.input.dto';
import { AdminUpdateShortContentClipMusicInputDto } from '@/admin/api/dtos/input/admin-update-short-content-clip-music.input.dto';
import { AdminUploadShortContentMusicInputDto } from '@/admin/api/dtos/input/admin-upload-short-content-music.input.dto';

/** A highlights job of the short-content service (see its README). */
export type ShortContentEngineJob = Record<string, unknown> & {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  title?: string;
  error?: string;
};

@Injectable()
export class ShortContentClientService {
  constructor(private readonly configService: ConfigService<ConfigurationType, true>) {}

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

  getMusicTracks(): Promise<Record<string, unknown>[]> {
    return this.call('GET', '/api/shorts/music-tracks');
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
