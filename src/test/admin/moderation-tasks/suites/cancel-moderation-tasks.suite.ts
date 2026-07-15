import { INestApplication } from '@nestjs/common';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { registerModerationTasksCancelSuccessSuite } from './cancel/cancel-success.suite';
import { registerModerationTasksCancelValidationSuite } from './cancel/cancel-validation.suite';
import { registerModerationTasksCancelTaskStateSuite } from './cancel/cancel-task-state.suite';

export type ModerationTasksCancelSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminModerationTaskUrl: () => string;
  getBaseUri: () => string;
  getFinishedTorrentModerationRepository: () => FinishedTorrentModerationRepository;
  createMovieAndTasks: (...args: any[]) => Promise<void>;
};

export function registerModerationTasksCancelSuite(
  context: ModerationTasksCancelSuiteContext,
): void {
  describe('Admin moderation tasks => Cancel task', () => {
    registerModerationTasksCancelSuccessSuite(context);
    registerModerationTasksCancelValidationSuite(context);
    registerModerationTasksCancelTaskStateSuite(context);
  });
}
