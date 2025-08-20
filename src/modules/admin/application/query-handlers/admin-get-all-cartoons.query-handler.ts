import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { AdminGetAllCartoonsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-cartoons.input-query.dto';
import {
  AdminCinemaCartoonsOutputDto,
  AdminCinemaCartoonsOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';
import { GetCartoonSortFieldEnum } from '@/cartoons/api/dtos/input/get-cartoon.input-query';

export class AdminGetAllCartoonsQuery implements IQuery {
  constructor(public query: AdminGetAllCartoonsInputQueryDto) {}
}

@QueryHandler(AdminGetAllCartoonsQuery)
export class AdminGetAllCartoonsQueryHandler
  implements
    IQueryHandler<
      AdminGetAllCartoonsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaCartoonsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly cartoonQueryRepository: CartoonQueryRepository,
    private readonly adminCinemaCartoonsOutputDtoMapper: AdminCinemaCartoonsOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetAllCartoonsQueryHandler.name);
  }

  async execute(
    query: AdminGetAllCartoonsQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminCinemaCartoonsOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all cartoons by admin command`, this.execute.name);
    const { page, size, searchGenreIds, searchName, sortField, sortDirection, status } =
      query.query;
    try {
      const totalCount = await this.cartoonQueryRepository.getCartoonCount(
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

      const movies = await this.cartoonQueryRepository.getCartoons(
        sortField as unknown as GetCartoonSortFieldEnum,
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
        movies ? this.adminCinemaCartoonsOutputDtoMapper.mapMovies(movies) : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
