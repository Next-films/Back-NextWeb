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
  CartoonsPublicOutputDto,
  CartoonsPublicOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons-public.output.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { CartoonPublicQueryRepository } from '@/cartoons/infrastructure/cartoon-public.query-repository';

export class GetPublicCartoonsQuery implements IQuery {
  constructor(public query: GetCartoonInputQuery) {}
}

@QueryHandler(GetPublicCartoonsQuery)
export class GetPublicCartoonsQueryHandler
  implements
    IQueryHandler<
      GetPublicCartoonsQuery,
      AppNotificationResult<
        PaginationUtil<CartoonsPublicOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonPublicQueryRepository: CartoonPublicQueryRepository,
    private readonly cartoonsPublicOutputDtoMapper: CartoonsPublicOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
  ) {
    this.logger.setContext(GetPublicCartoonsQueryHandler.name);
  }

  async execute(
    query: GetPublicCartoonsQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<CartoonsPublicOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    const { page, size, sortField, sortDirection, searchName, searchGenreIds } = query.query;
    const normalizedPage = typeof page === 'number' && Number.isFinite(page) ? page : 1;
    const normalizedSize = typeof size === 'number' && Number.isFinite(size) ? size : 50;
    const isFastHomeQuery =
      normalizedPage === 1 &&
      normalizedSize <= 12 &&
      !searchName &&
      (!searchGenreIds || searchGenreIds.length === 0);
    this.logger.log(`Get cartoons command`, this.execute.name);
    try {
      if (isFastHomeQuery) {
        const cartoons = await this.cartoonPublicQueryRepository.getCartoons(
          sortField,
          sortDirection,
          0,
          normalizedSize,
          null,
          null,
          false,
        );

        const result = this.paginationUtil.create(
          cartoons?.length || 0,
          1,
          normalizedPage,
          normalizedSize,
          cartoons && cartoons.length > 0
            ? this.cartoonsPublicOutputDtoMapper.mapAllPublicMovies(cartoons)
            : [],
        );

        return this.appNotification.success(result);
      }

      const totalCount = await this.cartoonPublicQueryRepository.getCartoonCount(
        searchName || null,
        searchGenreIds || null,
      );
      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, normalizedSize);

      const isValidPage = this.paginationUtil.isValidPage(normalizedPage, pagesCount, totalCount);

      if (!isValidPage)
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });

      const skip = this.paginationUtil.calculatePaginationSkip(normalizedPage, normalizedSize);

      const cartoons = await this.cartoonPublicQueryRepository.getCartoons(
        sortField,
        sortDirection,
        skip,
        normalizedSize,
        searchName || null,
        searchGenreIds || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        normalizedPage,
        normalizedSize,
        cartoons && cartoons.length > 0
          ? this.cartoonsPublicOutputDtoMapper.mapAllPublicMovies(cartoons)
          : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
