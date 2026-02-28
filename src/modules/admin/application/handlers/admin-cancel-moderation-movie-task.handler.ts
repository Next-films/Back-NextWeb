import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { MovieTypesEnum } from '@/common/types/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ICancelModerationMovieTaskByIdStrategy } from '@/admin/domain/types';
import { MovieHandleStatus } from '@/movies/domain/types';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { Serial } from '@/serials/domain/serial.entity';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { TelegramAdminBotSendNotificationAdminCancelModerationCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-cancel-moderation.handler';

export class AdminCancelModerationMovieTaskCommand implements ICommand {
  constructor(
    public taskId: number,
    public type: MovieTypesEnum,
    public adminId: number,
  ) {}
}

@CommandHandler(AdminCancelModerationMovieTaskCommand)
export class AdminCancelModerationMovieTaskCommandHandler
  implements
    ICommandHandler<
      AdminCancelModerationMovieTaskCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    private readonly moderationSerialRepository: ModerationSerialRepository,
    private readonly filmRepository: FilmRepository,
    private readonly finishedTorrentModerationRepository: FinishedTorrentModerationRepository,
    private readonly cartoonRepository: CartoonRepository,
    private readonly serialRepository: SerialRepository,
    @Inject(FinishedTorrentModerationEntity.name)
    private readonly finishedTorrentModerationEntity: typeof FinishedTorrentModerationEntity,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminCancelModerationMovieTaskCommandHandler.name);
  }
  async execute(
    command: AdminCancelModerationMovieTaskCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Cancel moderation movie task command`, this.execute.name);
    const { taskId, type, adminId } = command;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const strategy = this.getStrategyByType(type, queryRunner);
      if (!strategy) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          field: 'type',
          message: 'Undefined movie type',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_MOVIE_TYPE,
        });
      }

      const task = await strategy.getTask(taskId);

      if (!task) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.notFound({
          field: 'taskId',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          message: 'Task not found',
        });
      }

      const { admin: attachedAdmin, movie } = task;

      if (!attachedAdmin) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          message: 'The task not been accepted',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_ACCEPTED,
          field: 'taskId',
        });
      }

      const { id: attachedAdminId } = attachedAdmin;

      if (attachedAdminId !== adminId) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.forbidden({
          message: 'The task does not belong to the current user',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_BELONG_YOU,
          field: 'taskId',
        });
      }
      movie.showOrHiddeMovie(true, MovieHandleStatus.PROCESSING);

      const { kpId, id: movieId } = movie;

      const finishedTorrentModeration = await this.finishedTorrentModerationRepository.getByKpId(
        kpId,
        queryRunner,
      );

      let newFinishedTorrentModeration: FinishedTorrentModerationEntity | null = null;
      if (!finishedTorrentModeration) {
        newFinishedTorrentModeration = this.finishedTorrentModerationEntity.create(
          attachedAdminId,
          kpId,
        );
      }

      await Promise.all([
        strategy.removeTask(task),
        strategy.saveMovie(movie),
        ...(newFinishedTorrentModeration
          ? [
              this.finishedTorrentModerationRepository.save(
                newFinishedTorrentModeration,
                queryRunner,
              ),
            ]
          : []),
      ]);

      this.publish(type, adminId, movieId);

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

  private publish(type: MovieTypesEnum, adminId: number, movieId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationAdminCancelModerationCommand(type, adminId, movieId),
    );
  }

  private getStrategyByType(
    type: MovieTypesEnum,
    queryRunner: QueryRunner,
  ): ICancelModerationMovieTaskByIdStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTask: (...args) =>
            this.moderationFilmRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          removeTask: (task: ModerationFilmEntity) =>
            this.moderationFilmRepository.removeTask(task, queryRunner),
          saveMovie: (movie: Film) => this.filmRepository.save(movie, queryRunner),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTask: (...args) =>
            this.moderationCartoonRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          removeTask: (task: ModerationCartoonEntity) =>
            this.moderationCartoonRepository.removeTask(task, queryRunner),
          saveMovie: (movie: Cartoon) => this.cartoonRepository.save(movie, queryRunner),
        };

      case MovieTypesEnum.SERIAL:
        return {
          getTask: (...args) =>
            this.moderationSerialRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          removeTask: (task: ModerationSerialEntity) =>
            this.moderationSerialRepository.removeTask(task, queryRunner),
          saveMovie: (movie: Serial) => this.serialRepository.save(movie, queryRunner),
        };
      default:
        return null;
    }
  }
}
