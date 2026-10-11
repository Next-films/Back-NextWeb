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

export type StartSocialVideoUploadInput = {
  projectId: number;
  videoUrl: string;
};

export type StartedSocialVideoUpload = {
  externalUploadId: string;
  raw: Record<string, unknown>;
};

export type SocialVideoUploadStatus = {
  status: 'processing' | 'ready' | 'failed';
  externalFileId?: string;
  raw: Record<string, unknown>;
};

export type ScheduleUploadedSocialVideoInput = {
  projectId: number;
  accountIds: number[];
  externalFileId: string;
  scheduledAt: Date;
  title?: string;
  caption?: string;
};

export type ScheduledSocialVideo = {
  externalPublicationId: string;
  raw: Record<string, unknown>;
};

export type SocialProviderPublicationStatus = 'scheduled' | 'published' | 'failed';

export class SocialProviderAccountsNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = SocialProviderAccountsNotReadyError.name;
  }
}

export interface SocialPublishingProviderAdapter {
  readonly provider: SocialPublishingProvider;
  listProjects(): Promise<SocialProviderProject[]>;
  listAccounts(projectId: number): Promise<SocialProviderAccount[]>;
  assertAccountsReady(projectId: number, accountIds: number[]): Promise<void>;
  startVideoUpload(input: StartSocialVideoUploadInput): Promise<StartedSocialVideoUpload>;
  getVideoUploadStatus(externalUploadId: string): Promise<SocialVideoUploadStatus>;
  scheduleUploadedVideo(input: ScheduleUploadedSocialVideoInput): Promise<ScheduledSocialVideo>;
  getPublicationStatus(externalPublicationId: string): Promise<{
    status: SocialProviderPublicationStatus;
    raw: Record<string, unknown>;
  }>;
}
