import { SocialPublishingProvider } from '@/admin/domain/social-publishing-rule.entity';

export type SocialProviderProject = {
  id: number;
  name: string;
};

export type SocialProviderAccount = {
  id: number;
  name: string;
  login?: string;
  channelId?: number;
  channelCode?: string;
  connectionStatus?: number;
};

export type ScheduleSocialVideoInput = {
  projectId: number;
  accountIds: number[];
  videoUrl: string;
  scheduledAt: Date;
  title?: string;
  caption?: string;
};

export type ScheduledSocialVideo = {
  externalPublicationId: string;
  raw: Record<string, unknown>;
};

export type SocialProviderPublicationStatus = 'scheduled' | 'published' | 'failed';

export interface SocialPublishingProviderAdapter {
  readonly provider: SocialPublishingProvider;
  listProjects(): Promise<SocialProviderProject[]>;
  listAccounts(projectId: number): Promise<SocialProviderAccount[]>;
  scheduleVideo(input: ScheduleSocialVideoInput): Promise<ScheduledSocialVideo>;
  getPublicationStatus(externalPublicationId: string): Promise<{
    status: SocialProviderPublicationStatus;
    raw: Record<string, unknown>;
  }>;
}
