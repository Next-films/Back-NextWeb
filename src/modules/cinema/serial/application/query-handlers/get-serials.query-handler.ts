import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import {
  SerialsOutputDto,
  SerialsOutputDtoMapper,
} from '@/serials/api/dtos/output/serials.output.dto';
import { GetSerialInputQuery } from '@/serials/api/dtos/input/get-serial.input-query';

export class GetSerialsQuery implements IQuery {
  constructor(public query: GetSerialInputQuery) {}
}

@QueryHandler(GetSerialsQuery)
export class GetSerialsQueryHandler
  implements
    IQueryHandler<
      GetSerialsQuery,
      AppNotificationResult<PaginationUtil<SerialsOutputDto[]>, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialQueryRepository: SerialQueryRepository,
    private readonly serialsOutputDtoMapper: SerialsOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
  ) {
    this.logger.setContext(GetSerialsQueryHandler.name);
  }

  async execute(
    query: GetSerialsQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<SerialsOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    const { page, size, sortField, sortDirection, searchName, searchGenreIds } = query.query;
    this.logger.log(`Get serials command`, this.execute.name);
    try {
      const totalCount = await this.serialQueryRepository.getSerialCount(
        searchName || null,
        searchGenreIds || null,
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
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        serials && serials.length > 0 ? this.serialsOutputDtoMapper.mapSerials(serials) : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
