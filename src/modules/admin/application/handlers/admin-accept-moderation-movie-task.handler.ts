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
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { TelegramAdminBotSendNotificationAdminAcceptModerationCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-accept-moderation.handler';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { IAcceptModerationMovieTaskByIdStrategy } from '@/admin/domain/types';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';

export class AdminAcceptModerationMovieTaskCommand implements ICommand {
  constructor(
    public taskId: number,
    public type: MovieTypesEnum,
    public adminId: number,
  ) {}
}

@CommandHandler(AdminAcceptModerationMovieTaskCommand)
export class AdminAcceptModerationMovieTaskCommandHandler
  implements
    ICommandHandler<
      AdminAcceptModerationMovieTaskCommand,
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
    private readonly adminRepository: AdminRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminAcceptModerationMovieTaskCommandHandler.name);
  }
  async execute(
    command: AdminAcceptModerationMovieTaskCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Accept moderation movie task command`, this.execute.name);
    const { taskId, type, adminId } = command;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction('SERIALIZABLE');
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

      const { admin: attachedAdmin } = task;

      if (attachedAdmin) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          message: 'The task has already been accepted',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_ALREADY_ACCEPTED,
          field: 'taskId',
        });
      }

      const admin = await this.adminRepository.getAdminById(adminId, queryRunner);

      if (!admin) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.unauthorized({
          field: 'token',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
          message: 'Unauthorized',
        });
      }

      task.attachAdmin(admin);

      await strategy.saveTask(task);

      this.publish(type, taskId);

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

  private publish(type: MovieTypesEnum, taskId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(type, taskId),
    );
  }

  private getStrategyByType(
    type: MovieTypesEnum,
    queryRunner: QueryRunner,
  ): IAcceptModerationMovieTaskByIdStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTask: (...args) =>
            this.moderationFilmRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          saveTask: (task: ModerationFilmEntity) =>
            this.moderationFilmRepository.save(task, queryRunner),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTask: (...args) =>
            this.moderationCartoonRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          saveTask: (task: ModerationCartoonEntity) =>
            this.moderationCartoonRepository.save(task, queryRunner),
        };

      case MovieTypesEnum.SERIAL:
        return {
          getTask: (...args) =>
            this.moderationSerialRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          saveTask: (task: ModerationSerialEntity) =>
            this.moderationSerialRepository.save(task, queryRunner),
        };
      default:
        return null;
    }
  }
}
