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

type PostMyPostList<T> = { data?: T[] };

@Injectable()
export class PostMyPostPublishingService implements SocialPublishingProviderAdapter {
  readonly provider = SocialPublishingProvider.POSTMYPOST;

  constructor(private readonly externalApiConfigService: ExternalApiConfigService) {}

  async listProjects(): Promise<SocialProviderProject[]> {
    const response = await this.call<PostMyPostList<{ id: number; name: string }>>(
      'GET',
      '/projects?per_page=50',
    );

    return (response.data ?? []).map(project => ({ id: project.id, name: project.name }));
  }

  async listAccounts(projectId: number): Promise<SocialProviderAccount[]> {
    const [accounts, channels] = await Promise.all([
      this.call<
        PostMyPostList<{
          id: number;
          name: string;
          login?: string;
          chanel_id?: number;
          connection_status?: number;
        }>
      >('GET', `/accounts?project_id=${projectId}&per_page=50`),
      this.call<PostMyPostList<{ id: number; code: string }>>('GET', '/channels?per_page=50'),
    ]);
    const channelById = new Map((channels.data ?? []).map(channel => [channel.id, channel.code]));

    return (accounts.data ?? []).map(account => ({
      id: account.id,
      name: account.name,
      login: account.login,
      channelId: account.chanel_id,
      channelCode: account.chanel_id ? channelById.get(account.chanel_id) : undefined,
      connectionStatus: account.connection_status,
    }));
  }

  async scheduleVideo(input: ScheduleSocialVideoInput): Promise<ScheduledSocialVideo> {
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
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.token.trim()}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = `PostMyPost ${method} ${path} failed: ${response.status} ${errorText}`;

      if (response.status === 401 || response.status === 403) {
        throw new UnauthorizedException(message);
      }
      throw new ServiceUnavailableException(message);
    }

    return (await response.json()) as T;
  }
}
