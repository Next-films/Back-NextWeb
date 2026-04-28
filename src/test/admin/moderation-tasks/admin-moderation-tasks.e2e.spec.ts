import { INestApplication } from '@nestjs/common';

import { TestService } from '../../test.service';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

import { createModerationTaskFixtures } from './moderation-task-fixtures.util';
import { createMainAdminLogin } from '../../utils/auth/main-admin-login.util';
import { registerModerationTasksApplySuite } from './suites/apply-moderation-tasks.suite';
import { registerModerationTasksAcceptSuite } from './suites/accept-moderation-tasks.suite';
import { registerModerationTasksCancelSuite } from './suites/cancel-moderation-tasks.suite';
import { registerModerationTasksGetAllSuite } from './suites/get-all-moderation-tasks.suite';
import { registerModerationTasksGetByIdSuite } from './suites/get-by-id-moderation-tasks.suite';

describe('Admin moderation tasks', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let adminModerationTaskUrl: string;
  let moderationFilmRepository: ModerationFilmRepository;
  let moderationCartoonRepository: ModerationCartoonRepository;
  let filmRepository: FilmRepository;
  let cartoonRepository: CartoonRepository;
  let finishedTorrentModerationRepository: FinishedTorrentModerationRepository;
  let downloaderServiceAdapter: DownloaderServiceAdapter;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;
    const mainAdmin = createMainAdminLogin(app, appUri);
    baseUri = mainAdmin.baseUri;

    adminModerationTaskUrl = appUri + ADMIN_MODERATION_MOVIE_ROUTE.MAIN;

    moderationFilmRepository = app.get(ModerationFilmRepository);
    moderationCartoonRepository = app.get(ModerationCartoonRepository);
    filmRepository = app.get(FilmRepository);
    cartoonRepository = app.get(CartoonRepository);
    finishedTorrentModerationRepository = app.get(FinishedTorrentModerationRepository);
    downloaderServiceAdapter = app.get(DownloaderServiceAdapter);

    loginByMainAdmin = mainAdmin.loginByMainAdmin;
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateAdminMigration>(GenerateAdminMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  const createMovieAndTasks = (
    ...args: Parameters<ReturnType<typeof createModerationTaskFixtures>['createMovieAndTasks']>
  ) =>
    createModerationTaskFixtures({
      moderationFilmRepository,
      moderationCartoonRepository,
      filmRepository,
      cartoonRepository,
    }).createMovieAndTasks(...args);

  registerModerationTasksGetAllSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminModerationTaskUrl: () => adminModerationTaskUrl,
    createMovieAndTasks,
  });

  registerModerationTasksGetByIdSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminModerationTaskUrl: () => adminModerationTaskUrl,
    createMovieAndTasks,
  });

  registerModerationTasksAcceptSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminModerationTaskUrl: () => adminModerationTaskUrl,
    createMovieAndTasks,
  });

  registerModerationTasksCancelSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminModerationTaskUrl: () => adminModerationTaskUrl,
    getBaseUri: () => baseUri,
    getFinishedTorrentModerationRepository: () => finishedTorrentModerationRepository,
    createMovieAndTasks,
  });

  registerModerationTasksApplySuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminModerationTaskUrl: () => adminModerationTaskUrl,
    getBaseUri: () => baseUri,
    getFinishedTorrentModerationRepository: () => finishedTorrentModerationRepository,
    getFilmRepository: () => filmRepository,
    getCartoonRepository: () => cartoonRepository,
    getDownloaderServiceAdapter: () => downloaderServiceAdapter,
    createMovieAndTasks,
  });
});
