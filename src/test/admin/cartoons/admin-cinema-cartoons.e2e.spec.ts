import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { CommandBus } from '@nestjs/cqrs';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { NewCartoonNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import { NewCartoonIsHandleNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { createAdminCinemaMovieFactory } from '../admin-cinema-movie-factory.util';
import { createMainAdminLogin } from '../../utils/auth/main-admin-login.util';
import { registerAdminCinemaCartoonsGetAllSuite } from './suites/get-all-cartoons.suite';
import { registerAdminCinemaCartoonsRemoveSuite } from './suites/remove-cartoon.suite';
import { registerAdminCinemaCartoonsShowOrHideSuite } from './suites/show-or-hide-cartoon.suite';
import { registerAdminCinemaCartoonsUpdateSuite } from './suites/update-cartoon.suite';

describe('Admin cinema - cartoons', () => {
  let app: INestApplication;
  let testService: TestService;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let adminCinemaCartoonsUrl: string;
  let commandBus: CommandBus;
  let kinopoiskService: KinopoiskService;
  let moderationCartoonRepository: ModerationCartoonRepository;
  let telegramAdminBotService: TelegramAdminBotService;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;
    const mainAdmin = createMainAdminLogin(app, appUri);

    adminCinemaCartoonsUrl = appUri + `${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.CARTOONS}`;
    kinopoiskService = app.get(KinopoiskService);
    commandBus = app.get(CommandBus);
    moderationCartoonRepository = app.get(ModerationCartoonRepository);
    telegramAdminBotService = app.get(TelegramAdminBotService);
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

  const movieFactory = () =>
    createAdminCinemaMovieFactory({
      commandBus,
      kinopoiskService,
      createNotificationCommand: payload => new NewCartoonNotificationCommand(payload),
      createIsHandleCommand: payload => new NewCartoonIsHandleNotificationCommand(payload),
    });

  const suiteContext = {
    getApp: () => app,
    getTestService: () => testService,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminCinemaCartoonsUrl: () => adminCinemaCartoonsUrl,
    createMovieFactory: movieFactory,
    getModerationCartoonRepository: () => moderationCartoonRepository,
    getTelegramAdminBotService: () => telegramAdminBotService,
  };

  registerAdminCinemaCartoonsGetAllSuite(suiteContext);
  registerAdminCinemaCartoonsRemoveSuite(suiteContext);
  registerAdminCinemaCartoonsShowOrHideSuite(suiteContext);
  registerAdminCinemaCartoonsUpdateSuite(suiteContext);
});
