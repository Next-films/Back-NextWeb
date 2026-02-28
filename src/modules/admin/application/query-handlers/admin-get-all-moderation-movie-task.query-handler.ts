import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { GetAllModerationMovieTaskInputQueryDto } from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import {
  AdminModerationMovieTaskOutputDto,
  AdminModerationMovieTaskOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-moderation-movie-task.output.dto';
import { ModerationFilmQueryRepository } from '@/moderation-movie/infrastructure/moderation-film.query-repository';
import { ModerationCartoonQueryRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.query-repository';
import { ModerationSerialQueryRepository } from '@/moderation-movie/infrastructure/moderation-serial.query-repository';
import { MovieTypesEnum } from '@/common/types/types';
import { IGetModerationMovieTasksStrategy } from '@/admin/domain/types';

export class AdminGetAllModerationMovieTaskQuery implements IQuery {
  constructor(public query: GetAllModerationMovieTaskInputQueryDto) {}
}

@QueryHandler(AdminGetAllModerationMovieTaskQuery)
export class AdminGetAllModerationMovieTaskQueryHandler
  implements
    IQueryHandler<
      AdminGetAllModerationMovieTaskQuery,
      AppNotificationResult<
        PaginationUtil<AdminModerationMovieTaskOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly moderationFilmQueryRepository: ModerationFilmQueryRepository,
    private readonly moderationCartoonQueryRepository: ModerationCartoonQueryRepository,
    private readonly moderationSerialQueryRepository: ModerationSerialQueryRepository,
    private readonly adminModerationMovieTaskOutputDtoMapper: AdminModerationMovieTaskOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetAllModerationMovieTaskQueryHandler.name);
  }

  async execute(
    query: AdminGetAllModerationMovieTaskQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminModerationMovieTaskOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all moderation movie task by id command`, this.execute.name);
    const { status, searchMovieName, type, sortField, sortDirection, page, size } = query.query;
    try {
      const strategy = this.getStrategyByType(type);
      if (!strategy) {
        return this.appNotification.badRequest({
          field: 'type',
          message: 'Undefined movie type',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_MOVIE_TYPE,
        });
      }

      const totalCount = await strategy.getTotalCount(searchMovieName || null, status || null);

      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);

      const isValidPage = this.paginationUtil.isValidPage(page, pagesCount, totalCount);

      if (!isValidPage)
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });

      const skip = this.paginationUtil.calculatePaginationSkip(page, size);

      const tasks = await strategy.getTasks(
        sortField,
        sortDirection,
        skip,
        size,
        searchMovieName || null,
        status || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        tasks ? this.adminModerationMovieTaskOutputDtoMapper.mapTasks(tasks) : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private getStrategyByType(type: MovieTypesEnum): IGetModerationMovieTasksStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTasks: (...args) => this.moderationFilmQueryRepository.getFilmTasks(...args),
          getTotalCount: (name, status) =>
            this.moderationFilmQueryRepository.getFilmTasksCount(name, status),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTasks: (...args) => this.moderationCartoonQueryRepository.getCartoonTasks(...args),
          getTotalCount: (name, status) =>
            this.moderationCartoonQueryRepository.getCartoonTasksCount(name, status),
        };

      case MovieTypesEnum.SERIAL:
        return {
          getTasks: (...args) => this.moderationSerialQueryRepository.getSerialTasks(...args),
          getTotalCount: (name, status) =>
            this.moderationSerialQueryRepository.getSerialTasksCount(name, status),
        };
      default:
        return null;
    }
  }
}
