import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
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
import { TelegramAdminBotSendNotificationAdminCancelModerationCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-cancel-moderation.handler';
import { FilmModule } from '@/films/film.module';
import { CartoonModule } from '@/cartoons/cartoon.module';
import { TelegramAdminBotSendNotificationAdminFinishedModerationCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-finished-moderation.handler';
import { SerialModule } from '@/serials/serial.module';
import { SystemConnectionsStatusService } from '@/common/services/system-connections-status.service';
import { TelegramAdminBotInternalController } from '@/telegram/admin-bot/api/telegram-admin-bot-internal.controller';
import { TelegramAdminBotStartService } from '@/telegram/admin-bot/application/telegram-admin-bot-start.service';
import { TelegramStartInternalTokenGuard } from '@/telegram/admin-bot/application/guards/telegram-start-internal-token.guard';

const telegramAdminBotServiceProvider = {
  provide: TelegramAdminBotService,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    systemConnectionsStatusService: SystemConnectionsStatusService,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });

    return env.isTesting || env.isDevelopment
      ? new TelegramAdminBotServiceMock(logger, configService, systemConnectionsStatusService)
      : new TelegramAdminBotService(logger, configService, systemConnectionsStatusService);
  },
  inject: [ConfigService, LoggerService, SystemConnectionsStatusService],
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
  controllers: [TelegramAdminBotInternalController],
  providers: [
    telegramAdminBotServiceProvider,
    ...handlers,
    TelegramAdminBotStartService,
    TelegramStartInternalTokenGuard,
  ],
  exports: [TelegramAdminBotService],
})
export class TelegramAdminBotModule {}
