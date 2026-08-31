import { INestApplication } from '@nestjs/common';
import { TestService } from '../../../../../test/test.service';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import {
  AuthAdminTgUserCommand,
  AuthAdminTgUserHandler,
} from '@/telegram/admin-bot/application/guards/auth-tg-user.guard';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TelegramIncomingMessage } from '@/telegram/admin-bot/domain/types';

describe('AuthAdminTgUserHandler (integration)', () => {
  let app: INestApplication;
  let handler: AuthAdminTgUserHandler;
  let testService: TestService;
  let generateAdminMigration: GenerateAdminMigration;

  let admin_tg_id: number;
  let admin_tg_username: string;

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(AuthAdminTgUserHandler);
    generateAdminMigration = app.get(GenerateAdminMigration);
    const configService = app.get(ConfigService<ConfigurationType, true>);
    const apiSettings = configService.get('apiSettings', { infer: true });

    admin_tg_id = Number(apiSettings.ADMIN_TG_ID);
    admin_tg_username = apiSettings.ADMIN_TG_USERNAME;
  });

  beforeEach(async () => {
    await testService.clearDb();
    await generateAdminMigration.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully login', async () => {
    const tg_msg: TelegramIncomingMessage = {
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: admin_tg_id,
        username: admin_tg_username,
      },
    };

    const result = await handler.execute(new AuthAdminTgUserCommand(tg_msg));

    expect(result.appResult).toEqual(AppNotificationResultEnum.Success);
  });

  it('should not login if chat id not passed', async () => {
    const tg_msg: TelegramIncomingMessage = {
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: null as unknown as number,
        username: admin_tg_username,
      },
    };

    const result = await handler.execute(new AuthAdminTgUserCommand(tg_msg));

    expect(result.appResult).toEqual(AppNotificationResultEnum.Unauthorized);
  });

  it('should not login if user not found', async () => {
    const tg_msg: TelegramIncomingMessage = {
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: 1,
        username: admin_tg_username,
      },
    };

    const result = await handler.execute(new AuthAdminTgUserCommand(tg_msg));

    expect(result.appResult).toEqual(AppNotificationResultEnum.Unauthorized);
  });
});
