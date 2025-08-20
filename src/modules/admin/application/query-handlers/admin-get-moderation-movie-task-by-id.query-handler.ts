import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  AdminModerationMovieTaskByIdOutputDto,
  AdminModerationMovieTaskOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-moderation-movie-task.output.dto';
import { ModerationFilmQueryRepository } from '@/moderation-movie/infrastructure/moderation-film.query-repository';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationCartoonQueryRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.query-repository';
import { IGetModerationMovieTaskByIdStrategy } from '@/admin/domain/types';

export class AdminGetModerationMovieTaskByIdQuery implements IQuery {
  constructor(
    public taskId: number,
    public type: MovieTypesEnum,
  ) {}
}

@QueryHandler(AdminGetModerationMovieTaskByIdQuery)
export class AdminGetModerationMovieTaskByIdQueryHandler
  implements
    IQueryHandler<
      AdminGetModerationMovieTaskByIdQuery,
      AppNotificationResult<AdminModerationMovieTaskByIdOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly moderationFilmQueryRepository: ModerationFilmQueryRepository,
    private readonly moderationCartoonQueryRepository: ModerationCartoonQueryRepository,
    private readonly adminModerationMovieTaskOutputDtoMapper: AdminModerationMovieTaskOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetModerationMovieTaskByIdQueryHandler.name);
  }

  async execute(
    query: AdminGetModerationMovieTaskByIdQuery,
  ): Promise<
    AppNotificationResult<AdminModerationMovieTaskByIdOutputDto, ErrorFieldExceptionDto | null>
  > {
    this.logger.log(`Get moderation movie task by id command`, this.execute.name);
    const { taskId, type } = query;
    try {
      const strategy = this.getStrategyByType(type);
      if (!strategy) {
        return this.appNotification.badRequest({
          field: 'type',
          message: 'Undefined movie type',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_MOVIE_TYPE,
        });
      }

      const task = await strategy.getTask(taskId);

      if (!task)
        return this.appNotification.notFound({
          field: 'taskId',
          message: 'Task not found',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
        });

      const result = this.adminModerationMovieTaskOutputDtoMapper.mapTaskById(task);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private getStrategyByType(type: MovieTypesEnum): IGetModerationMovieTaskByIdStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTask: (...args) =>
            this.moderationFilmQueryRepository.getFilmTaskByIdWithMovieInfo(...args),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTask: (...args) =>
            this.moderationCartoonQueryRepository.getCartoonTaskByIdWithMovieInfo(...args),
        };

      case MovieTypesEnum.SERIAL:
        return null; // TODO: реализовать
      default:
        return null;
    }
  }
}
