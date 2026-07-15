import { INestApplication } from '@nestjs/common';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { registerModerationTasksGetAllSuccessSuite } from './get-all/get-all-success.suite';
import { registerModerationTasksGetAllValidationSuite } from './get-all/get-all-validation.suite';

export type ModerationTasksGetAllSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminModerationTaskUrl: () => string;
  createMovieAndTasks: (...args: any[]) => Promise<void>;
};

export function registerModerationTasksGetAllSuite(
  context: ModerationTasksGetAllSuiteContext,
): void {
  describe('Admin moderation tasks => Get all', () => {
    registerModerationTasksGetAllSuccessSuite(context);
    registerModerationTasksGetAllValidationSuite(context);
  });
}
