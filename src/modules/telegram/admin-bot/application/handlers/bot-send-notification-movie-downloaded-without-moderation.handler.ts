import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import {
  BotMovieDownloadedWithoutModerationPayloadDto,
  BotSendMessagePayloadDto,
  IAdminBotNotificationFinishedModerationStrategy,
} from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { MovieTypesEnum } from '@/common/types/types';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';

export class TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand
  implements ICommand
{
  constructor(
    public type: MovieTypesEnum,
    public movieId: number,
  ) {}
}

@CommandHandler(TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand)
export class TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommandHandler
  implements
    ICommandHandler<TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand, void>
{
  private readonly main_telegram_group_chat_id: string;
  private readonly new_film_telegram_thread_id: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly botService: TelegramAdminBotService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly filmRepository: FilmRepository,
    private readonly cartoonRepository: CartoonRepository,
    private readonly serialRepository: SerialRepository,
  ) {
    this.logger.setContext(
      TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommandHandler.name,
    );

    const apiSettings = this.configService.get('apiSettings', { infer: true });
    this.main_telegram_group_chat_id = apiSettings.MAIN_TELEGRAM_GROUP_CHAT_ID;
    this.new_film_telegram_thread_id = apiSettings.NEW_FILM_TELEGRAM_THREAD_ID;
  }

  async execute(
    command: TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand,
  ): Promise<void> {
    this.logger.log(
      `Send notification about movie downloaded without moderation.`,
      this.execute.name,
    );
    const { type, movieId } = command;

    try {
      const strategy = this.getStrategyByType(type);
      if (!strategy) {
        this.logger.warn('Undefined movie type', this.execute.name);
        return;
      }

      const movie = await strategy.getMovie(movieId);
      if (!movie) {
        this.logger.warn('Movie not found.', this.execute.name);
        return;
      }

      const payload: BotSendMessagePayloadDto = {
        chatId: Number(this.main_telegram_group_chat_id),
        threadId: Number(this.new_film_telegram_thread_id),
        template: ADMIN_BOT_TEMPLATES_NAME_ENUM.MOVIE_DOWNLOADED_WITHOUT_MODERATION,
      };

      const data: BotMovieDownloadedWithoutModerationPayloadDto = {
        movieId,
        title: movie.title,
        type: this.botService.getMovieTypeString(type),
      };

      await this.botService.sendHtmlMessage(payload, data);
    } catch (error) {
      this.logger.error(error, this.execute.name);
    }
  }

  private getStrategyByType(
    type: MovieTypesEnum,
  ): IAdminBotNotificationFinishedModerationStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getMovie: (...args) => this.filmRepository.getFilmById(...args),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getMovie: (...args) => this.cartoonRepository.getCartoonById(...args),
        };

      case MovieTypesEnum.SERIAL:
        return {
          getMovie: (...args) => this.serialRepository.getSerialById(...args),
        };

      default:
        return null;
    }
  }
}
