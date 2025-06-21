import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { BannedProvidersMovieQueryRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.query-repository';
import {
  AdminBannedProvidersMoviesOutputDto,
  AdminBannedProvidersMoviesOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-banned-providers-movies.output.dto';
import { GetAllBannedProvidersMoviesInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-banned-providers-movies.input-query.dto';

export class AdminGetAllBannedProvidersMoviesQuery implements IQuery {
  constructor(public query: GetAllBannedProvidersMoviesInputQueryDto) {}
}

@QueryHandler(AdminGetAllBannedProvidersMoviesQuery)
export class AdminGetAllBannedProvidersMoviesQueryHandler
  implements
    IQueryHandler<
      AdminGetAllBannedProvidersMoviesQuery,
      AppNotificationResult<
        PaginationUtil<AdminBannedProvidersMoviesOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly bannedProvidersMovieQueryRepository: BannedProvidersMovieQueryRepository,
    private readonly adminBannedProvidersMoviesOutputDtoMapper: AdminBannedProvidersMoviesOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetAllBannedProvidersMoviesQueryHandler.name);
  }

  async execute(
    query: AdminGetAllBannedProvidersMoviesQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminBannedProvidersMoviesOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all external tokens`, this.execute.name);
    const { providerId, provider, page, size, movieName } = query.query;
    try {
      const totalCount = await this.bannedProvidersMovieQueryRepository.getBannedMoviesCount(
        provider || null,
        providerId || null,
        movieName || null,
      );

      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);

      const isValidPage = this.paginationUtil.isValidPage(page, pagesCount, totalCount);

      if (!isValidPage)
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });

      const skip = this.paginationUtil.calculatePaginationSkip(page, size);
      const bannedMovies = await this.bannedProvidersMovieQueryRepository.getBannedMoviesByFilter(
        skip,
        size,
        provider || null,
        providerId || null,
        movieName || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        bannedMovies
          ? this.adminBannedProvidersMoviesOutputDtoMapper.mapEntities(bannedMovies)
          : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
