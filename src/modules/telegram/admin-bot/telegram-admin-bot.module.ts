import { Module } from '@nestjs/common';
import { TELEGRAM_ADMIN_BOT } from '@/common/constants/telegram-providers.constants';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import * as TelegramBot from 'node-telegram-bot-api';
import { TelegramAdminBotTemplatesService } from '@/telegram/admin-bot/application/telegram-admin-bot-templates.service';
import {
  TelegramAdminBotService,
  TelegramAdminBotServiceMock,
} from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { TelegramAdminBotStartCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-start.handler';
import { AuthAdminTgUserHandler } from '@/telegram/admin-bot/application/guards/auth-tg-user.guard';
import { AdminModule } from '@/admin/admin.module';
import { TelegramAdminBotSendNotificationNewModerationMovieCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-accept-moderation.handler';
import { ModerationMovieModule } from '@/moderation-movie/moderation-movie.module';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus } from '@nestjs/cqrs';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { TelegramAdminBotSendNotificationAdminCancelModerationCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-cancel-moderation.handler';
import { FilmModule } from '@/films/film.module';
import { CartoonModule } from '@/cartoons/cartoon.module';
import { TelegramAdminBotSendNotificationAdminFinishedModerationCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-finished-moderation.handler';
import { SerialModule } from '@/serials/serial.module';

const telegramProvider = {
  provide: TELEGRAM_ADMIN_BOT,
  useFactory: (configService: ConfigService<ConfigurationType, true>): TelegramBot | null => {
    const env = configService.get('environmentSettings', { infer: true });

    if (env.isTesting || env.isDevelopment) return null;

    const apiSettings = configService.get('apiSettings', { infer: true });
    const { TELEGRAM_ADMIN_BOT_TOKEN } = apiSettings;

    return new TelegramBot(TELEGRAM_ADMIN_BOT_TOKEN, { polling: false });
  },
  inject: [ConfigService],
};

const telegramAdminBotServiceProvider = {
  provide: TelegramAdminBotService,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    bot: TelegramBot,
    commandBus: CommandBus,
    templatesService: TelegramAdminBotTemplatesService,
    asyncLocalStorageService: AsyncLocalStorageService,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });

    return env.isTesting || env.isDevelopment
      ? new TelegramAdminBotServiceMock(
          bot,
          logger,
          commandBus,
          templatesService,
          asyncLocalStorageService,
          configService,
        )
      : new TelegramAdminBotService(
          bot,
          logger,
          commandBus,
          templatesService,
          asyncLocalStorageService,
          configService,
        );
  },
  inject: [
    ConfigService,
    LoggerService,
    TELEGRAM_ADMIN_BOT,
    CommandBus,
    TelegramAdminBotTemplatesService,
    AsyncLocalStorageService,
  ],
};

const handlers = [
  TelegramAdminBotStartCommandHandler,
  AuthAdminTgUserHandler,
  TelegramAdminBotSendNotificationNewModerationMovieCommandHandler,
  TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler,
  TelegramAdminBotSendNotificationAdminCancelModerationCommandHandler,
  TelegramAdminBotSendNotificationAdminFinishedModerationCommandHandler,
];

@Module({
  imports: [AdminModule, ModerationMovieModule, FilmModule, CartoonModule, SerialModule],
  controllers: [],
  providers: [
    telegramAdminBotServiceProvider,
    telegramProvider,
    ...handlers,
    TelegramAdminBotTemplatesService,
  ],
  exports: [],
})
export class TelegramAdminBotModule {}
