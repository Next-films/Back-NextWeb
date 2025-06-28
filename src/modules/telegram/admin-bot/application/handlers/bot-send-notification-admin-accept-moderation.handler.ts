import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import {
  BotAdminAcceptModerationPayloadDto,
  BotSendMessagePayloadDto,
  IAdminBotNotificationAcceptModerationStrategy,
} from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { DateUtil } from '@/common/utils/date.util';

export class TelegramAdminBotSendNotificationAdminAcceptModerationCommand implements ICommand {
  constructor(
    public type: MovieTypesEnum,
    public moderationId: number,
  ) {}
}

@CommandHandler(TelegramAdminBotSendNotificationAdminAcceptModerationCommand)
export class TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler
  implements ICommandHandler<TelegramAdminBotSendNotificationAdminAcceptModerationCommand, void>
{
  private readonly main_telegram_group_chat_id: string;
  private readonly new_film_telegram_thread_id: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly botService: TelegramAdminBotService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    private readonly dateUtil: DateUtil,
  ) {
    this.logger.setContext(
      TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler.name,
    );

    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.main_telegram_group_chat_id = apiSettings.MAIN_TELEGRAM_GROUP_CHAT_ID;
    this.new_film_telegram_thread_id = apiSettings.NEW_FILM_TELEGRAM_THREAD_ID;
  }

  async execute(
    command: TelegramAdminBotSendNotificationAdminAcceptModerationCommand,
  ): Promise<void> {
    this.logger.log(`Send notification about admin accept moderation command.`, this.execute.name);
    const { moderationId, type } = command;
    try {
      const strategy = this.getStrategyByType(type);
      if (!strategy) {
        this.logger.warn('Undefined movie type', this.execute.name);
        return;
      }

      const moderation = await strategy.getTask(moderationId);

      if (!moderation) {
        this.logger.warn('Moderation not found', this.execute.name);
        return;
      }

      const { acceptAt, admin, movie, movieId } = moderation;
      const { adminTelegram } = admin;
      const { username } = adminTelegram;
      const { title } = movie;

      const payload: BotSendMessagePayloadDto = {
        chatId: Number(this.main_telegram_group_chat_id),
        threadId: Number(this.new_film_telegram_thread_id),
        template: ADMIN_BOT_TEMPLATES_NAME_ENUM.MOVIE_MODERATION_ACCEPTED_BY_ADMIN,
      };

      const data: BotAdminAcceptModerationPayloadDto = {
        movieId,
        title,
        telegramUsername: username,
        acceptAt: this.dateUtil.formatDateYyMmDdHhMm(acceptAt),
        type: this.botService.getMovieTypeString(type),
      };

      await this.botService.sendHtmlMessage(payload, data);
    } catch (error) {
      this.logger.error(error, this.execute.name);
    }
  }

  private getStrategyByType(
    type: MovieTypesEnum,
  ): IAdminBotNotificationAcceptModerationStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTask: (...args) =>
            this.moderationFilmRepository.getModerationByIdWithMovieAndAdminInfo(...args),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTask: (...args) =>
            this.moderationCartoonRepository.getModerationByIdWithMovieAndAdminInfo(...args),
        };

      case MovieTypesEnum.SERIAL:
        return null; // TODO: реализовать
      default:
        return null;
    }
  }
}
