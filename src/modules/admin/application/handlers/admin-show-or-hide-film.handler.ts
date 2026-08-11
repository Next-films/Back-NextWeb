import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminShowOrHiddeFilmInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-film.input.dto';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieHandleStatus } from '@/movies/domain/types';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { Inject } from '@nestjs/common';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { MovieTypesEnum } from '@/common/types/types';
import { MoviesService } from '@/movies/application/movies.service';
import { Film } from '@/films/domain/film.entity';

export class AdminShowOrHiddeFilmCommand implements ICommand {
  constructor(
    public filmId: number,
    public inputDto: AdminShowOrHiddeFilmInputDto,
  ) {}
}

@CommandHandler(AdminShowOrHiddeFilmCommand)
export class AdminShowOrHiddeFilmCommandHandler
  implements
    ICommandHandler<
      AdminShowOrHiddeFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly filmRepository: FilmRepository,
    private readonly commandBus: CommandBus,
    private readonly moviesService: MoviesService,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    @Inject(ModerationFilmEntity.name)
    private readonly moderationFilmEntity: typeof ModerationFilmEntity,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminShowOrHiddeFilmCommandHandler.name);
  }
  async execute(
    command: AdminShowOrHiddeFilmCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Show or hidde film by admin command`, this.execute.name);
    const { inputDto, filmId } = command;
    const { isHidden, isModerate } = inputDto;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const film = await this.filmRepository.getFilmById(filmId, queryRunner);

      if (!film) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });
      }

      let newModerationId: number | null = null;

      const moderationTask = await this.moderationFilmRepository.getModerationByMovieId(
        filmId,
        queryRunner,
      );

      if (isModerate) {
        if (!moderationTask) {
          film.showOrHiddeMovie(true, MovieHandleStatus.MODERATE);

          newModerationId = await this.createModeration(film, queryRunner);
        }
      } else {
        if (
          (moderationTask && moderationTask.adminId && !isHidden) ||
          (moderationTask && moderationTask.torrentData)
        ) {
          await queryRunner.rollbackTransaction();

          return this.appNotification.badRequest({
            message: 'The film cannot be removed from moderation',
            errorKey: EXCEPTION_KEYS_ENUM.MOVIE_CANNOT_BE_REMOVED_FROM_MODERATION,
            field: 'isModerate',
          });
        }

        if (!isHidden) {
          if (this.moviesService.isPremiereWithoutVideo(film)) {
            this.moviesService.setHandleProductionStatusForPremiere(film);
          } else {
            this.moviesService.setHandleProductionStatus(film);
          }

          if (film.handleStatus === MovieHandleStatus.PRODUCTION && moderationTask) {
            await this.moderationFilmRepository.removeTask(moderationTask, queryRunner);
          }

          if (film.handleStatus === MovieHandleStatus.MODERATE && !moderationTask) {
            newModerationId = await this.createModeration(film, queryRunner);
          }
        } else {
          this.moviesService.setHandleProductionStatus(film);

          film.showOrHiddeMovie(isHidden);

          if (film.handleStatus === MovieHandleStatus.MODERATE && !moderationTask) {
            newModerationId = await this.createModeration(film, queryRunner);
          }

          if (film.handleStatus === MovieHandleStatus.PRODUCTION) {
            if (moderationTask) {
              await this.moderationFilmRepository.removeTask(moderationTask, queryRunner);
            }
          }
        }
      }

      await this.filmRepository.save(film, queryRunner);

      if (newModerationId) this.publishNewModeration(newModerationId);

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

  private async createModeration(film: Film, queryRunner: QueryRunner) {
    const { id } = film;
    const moderationCreateDto: CreateModerationDto = {
      movieId: id,
      torrentMetaData: null,
    };

    const newModeration =
      this.moderationFilmEntity.create<ModerationFilmEntity>(moderationCreateDto);

    const result = await this.moderationFilmRepository.save(newModeration, queryRunner);

    return result.id;
  }

  private publishNewModeration(taskId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(MovieTypesEnum.FILM, taskId),
    );
  }
}
