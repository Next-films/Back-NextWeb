import { INestApplication } from '@nestjs/common';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { registerModerationTasksApplyProductionSuite } from './apply/apply-production.suite';
import { registerModerationTasksApplyTorrentSuite } from './apply/apply-torrent.suite';
import { registerModerationTasksApplyAccessSuite } from './apply/apply-access.suite';
import { registerModerationTasksApplyTorrentValidationSuite } from './apply/apply-torrent-validation.suite';
import { registerModerationTasksApplyInputValidationSuite } from './apply/apply-input-validation.suite';

export type ModerationTasksApplySuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminModerationTaskUrl: () => string;
  getBaseUri: () => string;
  getFinishedTorrentModerationRepository: () => FinishedTorrentModerationRepository;
  getFilmRepository: () => FilmRepository;
  getCartoonRepository: () => CartoonRepository;
  getDownloaderServiceAdapter: () => DownloaderServiceAdapter;
  createMovieAndTasks: (...args: any[]) => Promise<void>;
};

export function registerModerationTasksApplySuite(context: ModerationTasksApplySuiteContext): void {
  describe('Admin moderation tasks => Apply task', () => {
    registerModerationTasksApplyProductionSuite(context);
    registerModerationTasksApplyTorrentSuite(context);
    registerModerationTasksApplyAccessSuite(context);
    registerModerationTasksApplyTorrentValidationSuite(context);
    registerModerationTasksApplyInputValidationSuite(context);
  });
}
