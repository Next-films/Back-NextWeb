import { INestApplication } from '@nestjs/common';
import { TestService } from '../../../../../test/test.service';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import {
  TelegramAdminBotStartCommand,
  TelegramAdminBotStartCommandHandler,
} from '@/telegram/admin-bot/application/handlers/bot-start.handler';
import {
  BotCommandsDto,
  BotSendMessagePayloadDto,
  TelegramIncomingMessage,
} from '@/telegram/admin-bot/domain/types';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';

describe('TelegramAdminBotStartCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: TelegramAdminBotStartCommandHandler;
  let testService: TestService;
  let generateAdminMigration: GenerateAdminMigration;
  let telegramAdminBotService: TelegramAdminBotService;
  let adminRepository: AdminRepository;

  let admin_tg_id: number;
  let admin_tg_username: string;

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(TelegramAdminBotStartCommandHandler);
    generateAdminMigration = app.get(GenerateAdminMigration);
    telegramAdminBotService = app.get(TelegramAdminBotService);
    adminRepository = app.get(AdminRepository);
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

  it('should send welcome message', async () => {
    const tg_msg: TelegramIncomingMessage = {
      message_id: 123,
      date: 1234,
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: admin_tg_id,
        is_bot: false,
        username: admin_tg_username,
        first_name: 'First',
        last_name: 'Last',
      },
    };

    const payload: BotCommandsDto = {
      tgMessage: tg_msg,
    };

    const expectedPayload: BotSendMessagePayloadDto = {
      chatId: admin_tg_id,
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.WELCOME,
    };

    const expectedData = {
      username: admin_tg_username,
    };

    const spy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');
    const adminRepoSpy = jest.spyOn(adminRepository, 'save');

    try {
      await handler.execute(new TelegramAdminBotStartCommand(payload));

      expect(spy).toHaveBeenCalled();
      expect(adminRepoSpy).not.toHaveBeenCalled();
      expect(spy).toHaveBeenNthCalledWith(
        1,
        expectedPayload,
        expect.objectContaining(expectedData),
      );
    } finally {
      spy.mockRestore();
      adminRepoSpy.mockRestore();
    }
  });

  it('should send welcome message and update username if admin does not has username', async () => {
    const tg_msg: TelegramIncomingMessage = {
      message_id: 123,
      date: 1234,
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: admin_tg_id,
        is_bot: false,
        username: admin_tg_username,
        first_name: 'First',
        last_name: 'Last',
      },
    };

    const payload: BotCommandsDto = {
      tgMessage: tg_msg,
    };

    const expectedPayload: BotSendMessagePayloadDto = {
      chatId: admin_tg_id,
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.WELCOME,
    };

    const expectedData = {
      username: admin_tg_username,
    };

    const spy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

    const admin = await adminRepository.getAdminByTelegramId(String(admin_tg_id));

    if (!admin) throw new Error('Admin not found (ERROR IN TEST)');

    admin.adminTelegram.username = null;
    await adminRepository.save(admin);

    try {
      const admin = await adminRepository.getAdminByTelegramId(String(admin_tg_id));

      expect(admin).toBeDefined();
      expect(admin?.adminTelegram.username).toBeNull();

      await handler.execute(new TelegramAdminBotStartCommand(payload));

      expect(spy).toHaveBeenCalled();

      expect(spy).toHaveBeenNthCalledWith(
        1,
        expectedPayload,
        expect.objectContaining(expectedData),
      );

      const admin2 = await adminRepository.getAdminByTelegramId(String(admin_tg_id));

      expect(admin2).toBeDefined();
      expect(admin2?.adminTelegram.username).toBe(admin_tg_username);
    } finally {
      spy.mockRestore();
    }
  });

  it('should not send welcome message chat id into message not found', async () => {
    const tg_msg: TelegramIncomingMessage = {
      message_id: 123,
      date: 1234,
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: null as unknown as number,
        is_bot: false,
        username: admin_tg_username,
        first_name: 'First',
        last_name: 'Last',
      },
    };

    const payload: BotCommandsDto = {
      tgMessage: tg_msg,
    };

    const spy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

    try {
      await handler.execute(new TelegramAdminBotStartCommand(payload));

      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('should not send welcome message, user not found', async () => {
    const tg_msg: TelegramIncomingMessage = {
      message_id: 123,
      date: 1234,
      chat: {
        id: 1,
        type: 'private',
      },
      from: {
        id: 9999,
        is_bot: false,
        username: admin_tg_username,
        first_name: 'First',
        last_name: 'Last',
      },
    };

    const payload: BotCommandsDto = {
      tgMessage: tg_msg,
    };

    const expectedPayload: BotSendMessagePayloadDto = {
      chatId: tg_msg.from!.id,
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU,
    };

    const spy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');
    try {
      await handler.execute(new TelegramAdminBotStartCommand(payload));

      expect(spy).toHaveBeenCalled();

      expect(spy).toHaveBeenNthCalledWith(1, expectedPayload);
    } finally {
      spy.mockRestore();
    }
  });
});
