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

      if (!film)
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const { id } = film;

      let moderationId: number | null = null;
      if (isModerate) {
        film.showOrHiddeMovie(isHidden, MovieHandleStatus.MODERATE);

        moderationId = await this.handleModerationStatus(id, queryRunner);

        if (!moderationId) {
          return this.appNotification.badRequest({
            message: 'Film already under moderation',
            errorKey: EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_UNDER_MODERATION,
            field: 'isModerate',
          });
        }
      } else {
        film.showOrHiddeMovie(isHidden);
      }

      await this.filmRepository.save(film, queryRunner);

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
    filmId: number,
    queryRunner: QueryRunner,
  ): Promise<number | null> {
    const moderationTask = await this.moderationFilmRepository.getModerationByMovieId(
      filmId,
      queryRunner,
    );

    if (moderationTask) {
      return null;
    }

    const moderationCreateDto: CreateModerationDto = {
      movieId: filmId,
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
