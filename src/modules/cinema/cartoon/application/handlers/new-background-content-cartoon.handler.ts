import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ApplicationNotification, AppNotificationResult } from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MoviesService } from '@/movies/application/movies.service';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { MovieTypesEnum } from '@/common/types/types';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';

export class NewBackGroundContentCartoonCommand implements ICommand {
  constructor(
    public url: string,
    public cartoonId: number,
  ) {}
}

@CommandHandler(NewBackGroundContentCartoonCommand)
export class NewBackGroundContentCartoonCommandHandler
  implements
    ICommandHandler<
      NewBackGroundContentCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Cartoon.name) private readonly cartoonEntity: typeof Cartoon,
    private readonly cartoonRepository: CartoonRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    @Inject(ModerationCartoonEntity.name)
    private readonly moderationCartoonEntity: typeof ModerationCartoonEntity,
    private readonly commandBus: CommandBus,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewBackGroundContentCartoonCommandHandler.name);
  }

  async execute(
    command: NewBackGroundContentCartoonCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`New background content cartoon command`, this.execute.name);
    const { url, cartoonId } = command;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [cartoon, moderationTask] = await Promise.all([
        this.cartoonRepository.getCartoonById(cartoonId, queryRunner),
        this.moderationCartoonRepository.getModerationByMovieId(cartoonId, queryRunner),
      ]);

      if (!cartoon) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
          message: 'Cartoon not found',
          field: 'cartoonId',
        });
      }

      if (moderationTask && moderationTask.adminId) {
        // TODO: Отправить нотификацию админу что появился новый контент
      } else {
        // TODO: Нотификация всем
      }

      cartoon.updateBackgroundUrl(url);

      await this.cartoonRepository.save(cartoon, queryRunner);

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
        MovieTypesEnum.CARTOON,
        moderationId,
      ),
    );
  }
}
