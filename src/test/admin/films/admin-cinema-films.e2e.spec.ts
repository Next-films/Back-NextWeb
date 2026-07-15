import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { NewFilmNotificationCommand } from '@/films/application/handlers/new-film-notification.handler';
import { CommandBus } from '@nestjs/cqrs';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { NewFilmIsHandleNotificationCommand } from '@/films/application/handlers/new-film-is-handle-notification.handler';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { createAdminCinemaMovieFactory } from '../admin-cinema-movie-factory.util';
import { createMainAdminLogin } from '../../utils/auth/main-admin-login.util';
import { registerAdminCinemaFilmsGetAllSuite } from './suites/get-all-films.suite';
import { registerAdminCinemaFilmsRemoveSuite } from './suites/remove-film.suite';
import { registerAdminCinemaFilmsShowOrHideSuite } from './suites/show-or-hide-film.suite';
import { registerAdminCinemaFilmsUpdateSuite } from './suites/update-film.suite';

describe('Admin cinema - films', () => {
  let app: INestApplication;
  let testService: TestService;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let adminCinemaFilmsUrl: string;
  let commandBus: CommandBus;
  let kinopoiskService: KinopoiskService;
  let moderationFilmRepository: ModerationFilmRepository;
  let telegramAdminBotService: TelegramAdminBotService;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;
    const mainAdmin = createMainAdminLogin(app, appUri);

    adminCinemaFilmsUrl = appUri + `${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.FILMS}`;
    kinopoiskService = app.get(KinopoiskService);
    commandBus = app.get(CommandBus);
    moderationFilmRepository = app.get(ModerationFilmRepository);
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
      createNotificationCommand: payload => new NewFilmNotificationCommand(payload),
      createIsHandleCommand: payload => new NewFilmIsHandleNotificationCommand(payload),
    });

  const suiteContext = {
    getApp: () => app,
    getTestService: () => testService,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getAdminCinemaFilmsUrl: () => adminCinemaFilmsUrl,
    createMovieFactory: movieFactory,
    getModerationFilmRepository: () => moderationFilmRepository,
    getTelegramAdminBotService: () => telegramAdminBotService,
  };

  registerAdminCinemaFilmsGetAllSuite(suiteContext);
  registerAdminCinemaFilmsRemoveSuite(suiteContext);
  registerAdminCinemaFilmsShowOrHideSuite(suiteContext);
  registerAdminCinemaFilmsUpdateSuite(suiteContext);
});
