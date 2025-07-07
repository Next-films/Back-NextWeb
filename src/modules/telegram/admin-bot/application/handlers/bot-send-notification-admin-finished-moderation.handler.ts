import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import {
  BotAdminFinishedModerationPayloadDto,
  BotSendMessagePayloadDto,
  IAdminBotNotificationFinishedModerationStrategy,
} from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { MovieTypesEnum } from '@/common/types/types';
import { DateUtil } from '@/common/utils/date.util';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';

export class TelegramAdminBotSendNotificationAdminFinishedModerationCommand implements ICommand {
  constructor(
    public type: MovieTypesEnum,
    public adminId: number,
    public movieId: number,
  ) {}
}

@CommandHandler(TelegramAdminBotSendNotificationAdminFinishedModerationCommand)
export class TelegramAdminBotSendNotificationAdminFinishedModerationCommandHandler
  implements ICommandHandler<TelegramAdminBotSendNotificationAdminFinishedModerationCommand, void>
{
  private readonly main_telegram_group_chat_id: string;
  private readonly new_film_telegram_thread_id: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly botService: TelegramAdminBotService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly adminRepository: AdminRepository,
    private readonly filmRepository: FilmRepository,
    private readonly cartoonRepository: CartoonRepository,
    private readonly dateUtil: DateUtil,
  ) {
    this.logger.setContext(
      TelegramAdminBotSendNotificationAdminFinishedModerationCommandHandler.name,
    );

    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.main_telegram_group_chat_id = apiSettings.MAIN_TELEGRAM_GROUP_CHAT_ID;
    this.new_film_telegram_thread_id = apiSettings.NEW_FILM_TELEGRAM_THREAD_ID;
  }

  async execute(
    command: TelegramAdminBotSendNotificationAdminFinishedModerationCommand,
  ): Promise<void> {
    this.logger.log(
      `Send notification about admin finished moderation command.`,
      this.execute.name,
    );
    const { type, adminId, movieId } = command;
    try {
      const strategy = this.getStrategyByType(type);
      if (!strategy) {
        this.logger.warn('Undefined movie type', this.execute.name);
        return;
      }

      const [movie, admin] = await Promise.all([
        strategy.getMovie(movieId),
        this.adminRepository.getAdminByIdWithTelegramInfo(adminId),
      ]);

      if (!admin) {
        this.logger.warn('Admin not found.', this.execute.name);
        return;
      }

      if (!movie) {
        this.logger.warn('Movie not found.', this.execute.name);
        return;
      }

      const { adminTelegram } = admin;
      const { username } = adminTelegram;
      const { title } = movie;

      const payload: BotSendMessagePayloadDto = {
        chatId: Number(this.main_telegram_group_chat_id),
        threadId: Number(this.new_film_telegram_thread_id),
        template: ADMIN_BOT_TEMPLATES_NAME_ENUM.MOVIE_MODERATION_FINISHED_BY_ADMIN,
      };

      const data: BotAdminFinishedModerationPayloadDto = {
        movieId,
        title,
        telegramUsername: username,
        finishedAt: this.dateUtil.formatDateYyMmDdHhMm(new Date()),
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
        return null; // TODO: реализовать
      default:
        return null;
    }
  }
}
