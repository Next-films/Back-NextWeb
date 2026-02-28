import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import {
  BotNewMovieForModerationPayloadDto,
  BotSendMessagePayloadDto,
  IAdminBotNotificationNewModerationStrategy,
} from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { MovieDurationUtil } from '@/common/utils/movie-duration.util';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';

export class TelegramAdminBotSendNotificationNewModerationMovieCommand implements ICommand {
  constructor(
    public type: MovieTypesEnum,
    public moderationId: number,
  ) {}
}

@CommandHandler(TelegramAdminBotSendNotificationNewModerationMovieCommand)
export class TelegramAdminBotSendNotificationNewModerationMovieCommandHandler
  implements ICommandHandler<TelegramAdminBotSendNotificationNewModerationMovieCommand, void>
{
  private readonly main_telegram_group_chat_id: string;
  private readonly new_film_telegram_thread_id: string;
  private readonly moderation_movie_front_url: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly botService: TelegramAdminBotService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    private readonly moderationSerialRepository: ModerationSerialRepository,
  ) {
    this.logger.setContext(TelegramAdminBotSendNotificationNewModerationMovieCommandHandler.name);

    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const businessRulesSettings = this.configService.get('businessRulesSettings', { infer: true });

    this.main_telegram_group_chat_id = apiSettings.MAIN_TELEGRAM_GROUP_CHAT_ID;
    this.new_film_telegram_thread_id = apiSettings.NEW_FILM_TELEGRAM_THREAD_ID;
    this.moderation_movie_front_url = businessRulesSettings.MODERATION_MOVIE_FRONT_URL;
  }

  async execute(command: TelegramAdminBotSendNotificationNewModerationMovieCommand): Promise<void> {
    this.logger.log(`Send notification about new moderation movie command.`, this.execute.name);
    const { type, moderationId } = command;
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

      const { movie } = moderation;
      const { title, duration, originalTitle, releaseDate, id } = movie;
      const payload: BotSendMessagePayloadDto = {
        chatId: Number(this.main_telegram_group_chat_id),
        threadId: Number(this.new_film_telegram_thread_id),
        template: ADMIN_BOT_TEMPLATES_NAME_ENUM.NEW_MOVIE_FOR_MODERATION,
      };

      const data: BotNewMovieForModerationPayloadDto = {
        title: title || 'unknown',
        duration: MovieDurationUtil.formatDuration(duration),
        releaseDate: releaseDate || 'unknown',
        originalTitle: originalTitle || 'unknown',
        link: `${this.moderation_movie_front_url}/${type}/${moderationId}`,
        movieId: id,
        type: this.botService.getMovieTypeString(type),
      };

      await this.botService.sendHtmlMessage(payload, data);
    } catch (error) {
      this.logger.error(error, this.execute.name);
    }
  }

  private getStrategyByType(
    type: MovieTypesEnum,
  ): IAdminBotNotificationNewModerationStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTask: (...args): Promise<ModerationFilmEntity | null> =>
            this.moderationFilmRepository.getModerationByIdWithMovieAndAdminInfo(...args),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTask: (...args): Promise<ModerationCartoonEntity | null> =>
            this.moderationCartoonRepository.getModerationByIdWithMovieAndAdminInfo(...args),
        };

      case MovieTypesEnum.SERIAL:
        return {
          getTask: (...args): Promise<ModerationSerialEntity | null> =>
            this.moderationSerialRepository.getModerationByIdWithMovieAndAdminInfo(...args),
        };
      default:
        return null;
    }
  }
}
