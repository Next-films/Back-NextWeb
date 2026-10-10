import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { SocialPublishingProvider } from '@/admin/domain/social-publishing-rule.entity';
import {
  ScheduleSocialVideoInput,
  ScheduledSocialVideo,
  SocialProviderAccount,
  SocialProviderProject,
  SocialPublishingProviderAdapter,
} from '@/admin/application/services/social-publishing-provider';

type PostMyPostList<T> = {
  data?: T[];
  pages?: {
    page?: number;
    total_pages?: number;
    next?: number | null;
  };
};

type PostMyPostChannel = { id: number; code: string };
type PostMyPostAccount = {
  id: number;
  name: string;
  login?: string;
  chanel_id?: number;
  connection_status?: number;
};

const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const CHANNEL_CACHE_TTL_MS = 5 * 60_000;
const RETRYABLE_GET_STATUSES = new Set([500, 502, 503, 504]);
const MAX_GET_ATTEMPTS = 3;

@Injectable()
export class PostMyPostPublishingService implements SocialPublishingProviderAdapter {
  readonly provider = SocialPublishingProvider.POSTMYPOST;
  private channelCache: { expiresAt: number; channels: PostMyPostChannel[] } | null = null;

  constructor(private readonly externalApiConfigService: ExternalApiConfigService) {}

  async listProjects(): Promise<SocialProviderProject[]> {
    const projects = await this.listAll<{ id: number; name: string }>('/projects');

    return projects.map(project => ({ id: project.id, name: project.name }));
  }

  async listAccounts(projectId: number): Promise<SocialProviderAccount[]> {
    const [accounts, channels] = await Promise.all([
      this.listAll<PostMyPostAccount>('/accounts', { project_id: projectId }),
      this.listChannels(),
    ]);
    const channelById = new Map(channels.map(channel => [channel.id, channel.code]));

    return accounts.map(account => ({
      id: account.id,
      name: account.name,
      login: account.login,
      channelId: account.chanel_id,
      channelCode: account.chanel_id ? channelById.get(account.chanel_id) : undefined,
      connectionStatus: account.connection_status,
    }));
  }

  async assertAccountsReady(projectId: number, accountIds: number[]): Promise<void> {
    const uniqueAccountIds = [...new Set(accountIds)];

    if (uniqueAccountIds.length === 0) {
      throw new ServiceUnavailableException('No PostMyPost accounts selected');
    }

    const accounts = await this.listAll<PostMyPostAccount>('/accounts', {
      project_id: projectId,
    });
    const accountById = new Map(accounts.map(account => [account.id, account]));
    const unavailable = uniqueAccountIds.flatMap(accountId => {
      const account = accountById.get(accountId);

      if (!account) return [`#${accountId}: account not found in the selected project`];
      if (Number(account.connection_status) !== 1) {
        return [
          `${account.name || `#${accountId}`}: account is not connected (status ${
            account.connection_status ?? 'unknown'
          })`,
        ];
      }
      return [];
    });

    if (unavailable.length > 0) {
      throw new ServiceUnavailableException(
        `PostMyPost account check failed: ${unavailable.join('; ')}`,
      );
    }
  }

  async scheduleVideo(input: ScheduleSocialVideoInput): Promise<ScheduledSocialVideo> {
    await this.assertAccountsReady(input.projectId, input.accountIds);

    const upload = await this.call<{ id: number }>('POST', '/upload/init', {
      project_id: input.projectId,
      url: input.videoUrl,
    });
    const fileId = await this.waitForFile(upload.id);
    const publication = await this.call<Record<string, unknown>>('POST', '/publications', {
      project_id: input.projectId,
      post_at: input.scheduledAt.toISOString(),
      account_ids: input.accountIds,
      publication_status: 5,
      details: [
        {
          publication_type: 4,
          content: input.caption || undefined,
          title: input.title || undefined,
          file_ids: [fileId],
          tiktok_comment: true,
          tiktok_duet: true,
          tiktok_stitch: true,
          tiktok_privacy_status: 1,
          youtube_privacy_status: 1,
          instagram_share_to_feed: true,
        },
      ],
    });
    const id = publication.id;

    if (typeof id !== 'number' && typeof id !== 'string') {
      throw new ServiceUnavailableException('PostMyPost did not return publication id');
    }

    return { externalPublicationId: String(id), raw: publication };
  }

  async getPublicationStatus(externalPublicationId: string): Promise<{
    status: 'scheduled' | 'published' | 'failed';
    raw: Record<string, unknown>;
  }> {
    const publication = await this.call<Record<string, unknown>>(
      'GET',
      `/publications/${encodeURIComponent(externalPublicationId)}`,
    );
    const status = Number(publication.publication_status);

    return {
      status: status === 1 ? 'published' : status === 3 ? 'failed' : 'scheduled',
      raw: publication,
    };
  }

  private async waitForFile(uploadId: number): Promise<number> {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      const upload = await this.call<{ status: number; file_id?: number }>(
        'GET',
        `/upload/status?id=${uploadId}`,
      );

      if (upload.status === 1 && upload.file_id) {
        return upload.file_id;
      }
      if (upload.status === 2) {
        throw new ServiceUnavailableException('PostMyPost failed to process the video');
      }

      // /upload/* is limited to 10 requests per rolling minute.
      await delay(7_000);
    }

    throw new ServiceUnavailableException('PostMyPost video processing timed out');
  }

  private async listChannels(): Promise<PostMyPostChannel[]> {
    if (this.channelCache && this.channelCache.expiresAt > Date.now()) {
      return this.channelCache.channels;
    }

    const channels = await this.listAll<PostMyPostChannel>('/channels');
    this.channelCache = { channels, expiresAt: Date.now() + CHANNEL_CACHE_TTL_MS };
    return channels;
  }

  private async listAll<T>(
    path: string,
    query: Record<string, string | number> = {},
  ): Promise<T[]> {
    const result: T[] = [];
    let page = 1;

    while (page <= MAX_PAGES) {
      const search = new URLSearchParams({
        ...Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])),
        per_page: String(PAGE_SIZE),
      });
      if (page > 1) search.set('page', String(page));

      const response = await this.call<PostMyPostList<T>>('GET', `${path}?${search.toString()}`);
      const items = response.data ?? [];
      result.push(...items);

      const nextPage = response.pages?.next;
      if (typeof nextPage === 'number' && nextPage > page) {
        page = nextPage;
        continue;
      }
      if (response.pages?.total_pages !== undefined && page < response.pages.total_pages) {
        page += 1;
        continue;
      }
      if (!response.pages && items.length === PAGE_SIZE) {
        page += 1;
        continue;
      }
      break;
    }

    return result;
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const config = await this.externalApiConfigService.getActiveConfig(
      ExternalApiProviderEnum.POSTMYPOST,
      ExternalApiTargetEnum.BACK,
    );

    if (!config?.token?.trim()) {
      throw new ServiceUnavailableException(
        'PostMyPost API is not configured in external API settings',
      );
    }

    const baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
    const maxAttempts = method === 'GET' ? MAX_GET_ATTEMPTS : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${config.token.trim()}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        if (method === 'GET' && attempt < maxAttempts) {
          await delay(250 * 2 ** (attempt - 1));
          continue;
        }

        throw new ServiceUnavailableException(
          `PostMyPost ${method} ${path} is temporarily unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      if (response.ok) return (await response.json()) as T;

      const errorText = await response.text();
      const message = `PostMyPost ${method} ${path} failed: ${response.status} ${errorText}`;

      if (response.status === 401 || response.status === 403) {
        throw new UnauthorizedException(message);
      }
      if (
        method === 'GET' &&
        RETRYABLE_GET_STATUSES.has(response.status) &&
        attempt < maxAttempts
      ) {
        await delay(this.getRetryDelayMs(response, attempt));
        continue;
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new ServiceUnavailableException(
          `${message}${retryAfter ? `; retry after ${retryAfter} seconds` : ''}`,
        );
      }
      throw new ServiceUnavailableException(message);
    }

    throw new ServiceUnavailableException(`PostMyPost ${method} ${path} failed after retries`);
  }

  private getRetryDelayMs(response: Response, attempt: number): number {
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);

    if (Number.isFinite(retryAfter) && retryAfter >= 0) {
      return Math.min(retryAfter * 1_000, 5_000);
    }

    const resetAtHeader = response.headers.get('x-rate-limit-reset');
    const resetAt = resetAtHeader === null ? Number.NaN : Number(resetAtHeader);
    if (Number.isFinite(resetAt) && resetAt > 0) {
      return Math.min(Math.max(resetAt * 1_000 - Date.now(), 0), 5_000);
    }

    return 500 * 2 ** (attempt - 1);
  }
}
