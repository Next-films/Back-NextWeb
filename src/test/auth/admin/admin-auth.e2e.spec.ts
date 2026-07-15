import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { createMainAdminLogin } from '../../utils/auth/main-admin-login.util';
import { registerAdminAuthLoginSuite } from './suites/login.suite';
import { registerAdminAuthLogoutSuite } from './suites/logout.suite';
import { registerAdminAuthMeSuite } from './suites/me.suite';
import { registerAdminAuthRegistrationSuite } from './suites/registration.suite';
import { registerAdminAuthUpdateTokensSuite } from './suites/update-tokens.suite';

describe('Admin auth', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  let mainAdminLoginData: Record<string, unknown>;
  let adminAuthSessionRepository: AdminAuthSessionRepository;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;
    const mainAdmin = createMainAdminLogin(app, appUri);
    mainAdminLoginData = mainAdmin.loginData as unknown as Record<string, unknown>;
    adminAuthSessionRepository = app.get(AdminAuthSessionRepository);
    baseUri = mainAdmin.baseUri;
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

  const suiteContext = {
    getApp: () => app,
    getTestService: () => testService,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getBaseUri: () => baseUri,
    getMainAdminLoginData: () => mainAdminLoginData,
    getAdminAuthSessionRepository: () => adminAuthSessionRepository,
  };

  registerAdminAuthLoginSuite(suiteContext);
  registerAdminAuthRegistrationSuite(suiteContext);
  registerAdminAuthLogoutSuite(suiteContext);
  registerAdminAuthUpdateTokensSuite(suiteContext);
  registerAdminAuthMeSuite(suiteContext);
});
