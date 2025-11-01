import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { Film } from '@/films/domain/film.entity';
import { MoviesService } from '@/movies/application/movies.service';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { MovieTypesEnum } from '@/common/types/types';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export class NewBackGroundContentFilmCommand implements ICommand {
  constructor(
    public url: string,
    public filmId: number,
  ) {}
}

@CommandHandler(NewBackGroundContentFilmCommand)
export class NewBackGroundContentFilmCommandHandler
  implements
    ICommandHandler<
      NewBackGroundContentFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Film.name) private readonly filmEntity: typeof Film,
    private readonly filmRepository: FilmRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    @Inject(ModerationFilmEntity.name)
    private readonly moderationFilmEntity: typeof ModerationFilmEntity,
    private readonly commandBus: CommandBus,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewBackGroundContentFilmCommandHandler.name);
  }

  async execute(
    command: NewBackGroundContentFilmCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`New background content film command`, this.execute.name);
    const { url, filmId } = command;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [film, moderationTask] = await Promise.all([
        this.filmRepository.getFilmById(filmId, queryRunner),
        this.moderationFilmRepository.getModerationByMovieId(filmId, queryRunner),
      ]);

      if (!film) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
          message: 'Film not found',
          field: 'filmId',
        });
      }

      if (moderationTask && moderationTask.adminId) {
        // TODO: Отправить нотификацию админу что появился новый контент
      } else {
        // TODO: Нотификация всем
      }

      film.updateBackgroundUrl(url);

      await this.filmRepository.save(film, queryRunner);

      await queryRunner.commitTransaction();
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();
      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }

  private publish(moderationId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(
        MovieTypesEnum.FILM,
        moderationId,
      ),
    );
  }
}
