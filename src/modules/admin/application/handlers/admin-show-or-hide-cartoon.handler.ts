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
import { AdminShowOrHiddeCartoonInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-cartoon.input.dto';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';

export class AdminShowOrHiddeCartoonCommand implements ICommand {
  constructor(
    public cartoonId: number,
    public inputDto: AdminShowOrHiddeCartoonInputDto,
  ) {}
}

@CommandHandler(AdminShowOrHiddeCartoonCommand)
export class AdminShowOrHiddeCartoonCommandHandler
  implements
    ICommandHandler<
      AdminShowOrHiddeCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly cartoonRepository: CartoonRepository,
    private readonly commandBus: CommandBus,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    @Inject(ModerationCartoonEntity.name)
    private readonly moderationCartoonEntity: typeof ModerationCartoonEntity,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminShowOrHiddeCartoonCommandHandler.name);
  }
  async execute(
    command: AdminShowOrHiddeCartoonCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Show or hidde cartoon by admin command`, this.execute.name);
    const { inputDto, cartoonId } = command;
    const { isHidden, isModerate } = inputDto;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const cartoon = await this.cartoonRepository.getCartoonById(cartoonId, queryRunner);

      if (!cartoon) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });
      }

      const { id } = cartoon;

      let moderationId: number | null = null;
      if (isModerate) {
        cartoon.showOrHiddeMovie(isHidden, MovieHandleStatus.MODERATE);

        moderationId = await this.handleModerationStatus(id, queryRunner);

        if (!moderationId) {
          await queryRunner.rollbackTransaction();

          return this.appNotification.badRequest({
            message: 'Cartoon already under moderation',
            errorKey: EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_UNDER_MODERATION,
            field: 'isModerate',
          });
        }
      } else {
        cartoon.showOrHiddeMovie(isHidden);
      }

      await this.cartoonRepository.save(cartoon, queryRunner);

      if (moderationId) this.publishNewModeration(moderationId);

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

  private async handleModerationStatus(
    cartoonId: number,
    queryRunner: QueryRunner,
  ): Promise<number | null> {
    const moderationTask = await this.moderationCartoonRepository.getModerationByMovieId(
      cartoonId,
      queryRunner,
    );

    if (moderationTask) {
      return null;
    }

    const moderationCreateDto: CreateModerationDto = {
      movieId: cartoonId,
      torrentMetaData: null,
    };

    const newModeration =
      this.moderationCartoonEntity.create<ModerationCartoonEntity>(moderationCreateDto);

    const result = await this.moderationCartoonRepository.save(newModeration, queryRunner);

    return result.id;
  }

  private publishNewModeration(taskId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(MovieTypesEnum.CARTOON, taskId),
    );
  }
}
