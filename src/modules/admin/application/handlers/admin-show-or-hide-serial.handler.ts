import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieHandleStatus } from '@/movies/domain/types';
import { Inject } from '@nestjs/common';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { MovieTypesEnum } from '@/common/types/types';
import { MoviesService } from '@/movies/application/movies.service';
import { AdminShowOrHiddeSerialInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-serial.input.dto';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { Serial } from '@/serials/domain/serial.entity';

export class AdminShowOrHiddeSerialCommand implements ICommand {
  constructor(
    public serialId: number,
    public inputDto: AdminShowOrHiddeSerialInputDto,
  ) {}
}

@CommandHandler(AdminShowOrHiddeSerialCommand)
export class AdminShowOrHiddeSerialCommandHandler
  implements
    ICommandHandler<
      AdminShowOrHiddeSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly serialRepository: SerialRepository,
    private readonly commandBus: CommandBus,
    private readonly moviesService: MoviesService,
    private readonly moderationSerialRepository: ModerationSerialRepository,
    @Inject(ModerationSerialEntity.name)
    private readonly moderationSerialEntity: typeof ModerationSerialEntity,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminShowOrHiddeSerialCommandHandler.name);
  }
  async execute(
    command: AdminShowOrHiddeSerialCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Show or hide serial by admin command`, this.execute.name);
    const { inputDto, serialId } = command;
    const { isHidden, isModerate } = inputDto;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const serial = await this.serialRepository.getSerialById(serialId, queryRunner);

      if (!serial) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });
      }

      let newModerationId: number | null = null;

      const moderationTask = await this.moderationSerialRepository.getModerationByMovieId(
        serialId,
        queryRunner,
      );

      if (isModerate) {
        if (!moderationTask) {
          serial.showOrHiddeMovie(true, MovieHandleStatus.MODERATE);

          newModerationId = await this.createModeration(serial, queryRunner);
        }
      } else {
        if (
          (moderationTask && moderationTask.adminId && !isHidden) ||
          (moderationTask && moderationTask.torrentData)
        ) {
          await queryRunner.rollbackTransaction();

          return this.appNotification.badRequest({
            message: 'The serial cannot be removed from moderation',
            errorKey: EXCEPTION_KEYS_ENUM.MOVIE_CANNOT_BE_REMOVED_FROM_MODERATION,
            field: 'isModerate',
          });
        }

        if (!isHidden) {
          if (this.moviesService.isPremiereWithoutVideo(serial)) {
            this.moviesService.setHandleProductionStatusForPremiere(serial);
          } else {
            this.moviesService.setHandleProductionStatus(serial);
          }

          if (serial.handleStatus === MovieHandleStatus.PRODUCTION && moderationTask) {
            await this.moderationSerialRepository.removeTask(moderationTask, queryRunner);
          }

          if (serial.handleStatus === MovieHandleStatus.MODERATE && !moderationTask) {
            newModerationId = await this.createModeration(serial, queryRunner);
          }
        } else {
          this.moviesService.setHandleProductionStatus(serial);

          serial.showOrHiddeMovie(isHidden);

          if (serial.handleStatus === MovieHandleStatus.MODERATE && !moderationTask) {
            newModerationId = await this.createModeration(serial, queryRunner);
          }

          if (serial.handleStatus === MovieHandleStatus.PRODUCTION) {
            if (moderationTask) {
              await this.moderationSerialRepository.removeTask(moderationTask, queryRunner);
            }
          }
        }
      }

      await this.serialRepository.save(serial, queryRunner);

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

  private async createModeration(serial: Serial, queryRunner: QueryRunner) {
    const { id } = serial;
    const moderationCreateDto: CreateModerationDto = {
      movieId: id,
      torrentMetaData: null,
    };

    const newModeration =
      this.moderationSerialEntity.create<ModerationSerialEntity>(moderationCreateDto);

    const result = await this.moderationSerialRepository.save(newModeration, queryRunner);

    return result.id;
  }

  private publishNewModeration(taskId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(MovieTypesEnum.SERIAL, taskId),
    );
  }
}
