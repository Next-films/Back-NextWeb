import { INestApplication } from '@nestjs/common';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ADMIN_EXTERNAL_API_ROUTE, EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { initTestSettings } from '../../test-init-settings';
import { TestService } from '../../test.service';
import { createMainAdminLogin } from '../../utils/auth/main-admin-login.util';
import { registerCreateExternalTokenSuite } from './suites/create-external-token.suite';
import { registerGetExternalTokenSuite } from './suites/get-external-token.suite';
import { registerRemoveExternalTokenSuite } from './suites/remove-external-token.suite';
import { registerUpdateExternalTokenSuite } from './suites/update-external-token.suite';

describe('Admin external token', () => {
  let app: INestApplication;
  let testService: TestService;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let baseAdminExternalTokenUti: string;
  let baseExternalTokenUri: string;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;

    const { loginByMainAdmin: loginByMainAdminFn } = createMainAdminLogin(app, createApp.baseUri);

    loginByMainAdmin = loginByMainAdminFn;
    baseAdminExternalTokenUti = createApp.baseUri + ADMIN_EXTERNAL_API_ROUTE.MAIN;
    baseExternalTokenUri = createApp.baseUri + EXTERNAL_API_ROUTE.MAIN;
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateAdminMigration>(GenerateAdminMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  registerCreateExternalTokenSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getBaseAdminExternalTokenUti: () => baseAdminExternalTokenUti,
    getBaseExternalTokenUri: () => baseExternalTokenUri,
  });

  registerUpdateExternalTokenSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getBaseAdminExternalTokenUti: () => baseAdminExternalTokenUti,
    getBaseExternalTokenUri: () => baseExternalTokenUri,
  });

  registerRemoveExternalTokenSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getBaseAdminExternalTokenUti: () => baseAdminExternalTokenUti,
    getBaseExternalTokenUri: () => baseExternalTokenUri,
  });

  registerGetExternalTokenSuite({
    getApp: () => app,
    getLoginByMainAdmin: () => loginByMainAdmin,
    getBaseAdminExternalTokenUti: () => baseAdminExternalTokenUti,
  });
});
