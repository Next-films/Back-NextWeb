import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { PaginationUtil } from '@/common/utils/pagination.util';
import {
  AdminCinemaFilmsOutputDto,
  AdminCinemaFilmsOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-films.output.dto';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { AdminGetAllFilmsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';

export class AdminGetAllFilmsQuery implements IQuery {
  constructor(public query: AdminGetAllFilmsInputQueryDto) {}
}

@QueryHandler(AdminGetAllFilmsQuery)
export class AdminGetAllFilmsQueryHandler
  implements
    IQueryHandler<
      AdminGetAllFilmsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaFilmsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly filmQueryRepository: FilmQueryRepository,
    private readonly adminCinemaFilmsOutputDtoMapper: AdminCinemaFilmsOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetAllFilmsQueryHandler.name);
  }

  async execute(
    query: AdminGetAllFilmsQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminCinemaFilmsOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all films by admin command`, this.execute.name);
    const { page, size, searchGenreIds, searchName, sortField, sortDirection, status } =
      query.query;
    try {
      const totalCount = await this.filmQueryRepository.getFilmsCount(
        searchName || null,
        searchGenreIds || null,
        status || null,
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
      const bannedMovies = await this.filmQueryRepository.getFilms(
        sortField,
        sortDirection,
        skip,
        size,
        searchName || null,
        searchGenreIds || null,
        status || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        bannedMovies ? this.adminCinemaFilmsOutputDtoMapper.mapMovies(bannedMovies) : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
