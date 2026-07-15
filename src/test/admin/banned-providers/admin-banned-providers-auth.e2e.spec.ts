import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE,
} from '@/common/constants/route.constants';
import { adminLogin } from '../../utils/auth/admin-login';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { registerAdminBannedProvidersBanUnbanSuite } from './suites/ban-unban-banned-provider-movie.suite';
import { registerAdminBannedProvidersGetSuite } from './suites/get-banned-provider-movie.suite';
import { registerAdminBannedProvidersUpdateSuite } from './suites/update-banned-provider-movie.suite';

describe('Admin banned providers movies', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let baseBannedProviderMovieTokenUri: string;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    const apiSettings = app
      .get(ConfigService<ConfigurationType, true>)
      .get('apiSettings', { infer: true });

    mainAdminLoginData.email = apiSettings.ADMIN_EMAIL;
    mainAdminLoginData.password = apiSettings.ADMIN_PASSWORD;

    baseUri = appUri + ADMIN_AUTH_ROUTES.MAIN;

    baseBannedProviderMovieTokenUri = appUri + ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE.MAIN;

    loginByMainAdmin = () =>
      adminLogin(app, `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`, mainAdminLoginData);
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateAdminMigration>(GenerateAdminMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  const suiteContext = {
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getBaseBannedProviderMovieTokenUri: () => baseBannedProviderMovieTokenUri,
  };

  registerAdminBannedProvidersBanUnbanSuite(suiteContext);
  registerAdminBannedProvidersUpdateSuite(suiteContext);
  registerAdminBannedProvidersGetSuite(suiteContext);
});
