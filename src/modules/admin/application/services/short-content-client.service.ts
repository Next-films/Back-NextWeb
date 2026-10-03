import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminCreateShortContentHighlightsInputDto } from '@/admin/api/dtos/input/admin-create-short-content-highlights.input.dto';

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

  getHighlights(engineJobId: string): Promise<ShortContentEngineJob> {
    return this.call('GET', `/api/shorts/highlights/${encodeURIComponent(engineJobId)}`);
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
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
    okStatuses: number[] = [],
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
      signal: AbortSignal.timeout(30_000),
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
