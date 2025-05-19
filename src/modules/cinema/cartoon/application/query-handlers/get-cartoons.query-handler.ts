import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { GetCartoonInputQuery } from '@/cartoons/api/dtos/input/get-cartoon.input-query';
import {
  CartoonsOutputDto,
  CartoonsOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons.output.dto';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export class GetCartoonsQuery implements IQuery {
  constructor(public query: GetCartoonInputQuery) {}
}

@QueryHandler(GetCartoonsQuery)
export class GetCartoonsQueryHandler
  implements
    IQueryHandler<
      GetCartoonsQuery,
      AppNotificationResult<PaginationUtil<CartoonsOutputDto[]>, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonQueryRepository: CartoonQueryRepository,
    private readonly cartoonsOutputDtoMapper: CartoonsOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
  ) {
    this.logger.setContext(GetCartoonsQueryHandler.name);
  }

  async execute(
    query: GetCartoonsQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<CartoonsOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    const { page, size, sortField, sortDirection, searchName, searchGenreIds } = query.query;
    this.logger.log(`Get cartoons command`, this.execute.name);
    try {
      const totalCount = await this.cartoonQueryRepository.getCartoonCount(
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

      const cartoons = await this.cartoonQueryRepository.getCartoons(
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
        cartoons && cartoons.length > 0 ? this.cartoonsOutputDtoMapper.mapMovies(cartoons) : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
