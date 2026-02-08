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
  AdminCinemaSerialsOutputDto,
  AdminCinemaSerialsOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import { AdminGetAllSerialsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-serials.input-query.dto';

export class AdminGetAllSerialsQuery implements IQuery {
  constructor(public query: AdminGetAllSerialsInputQueryDto) {}
}

@QueryHandler(AdminGetAllSerialsQuery)
export class AdminGetAllSerialsQueryHandler
  implements
    IQueryHandler<
      AdminGetAllSerialsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaSerialsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly serialQueryRepository: SerialQueryRepository,
    private readonly adminCinemaSerialsOutputDtoMapper: AdminCinemaSerialsOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetAllSerialsQueryHandler.name);
  }

  async execute(
    query: AdminGetAllSerialsQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminCinemaSerialsOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all serials by admin command`, this.execute.name);
    const { page, size, searchGenreIds, searchName, sortField, sortDirection, status } =
      query.query;
    try {
      const totalCount = await this.serialQueryRepository.getSerialCount(
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
      const serials = await this.serialQueryRepository.getSerials(
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
        serials ? this.adminCinemaSerialsOutputDtoMapper.mapMovies(serials) : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
