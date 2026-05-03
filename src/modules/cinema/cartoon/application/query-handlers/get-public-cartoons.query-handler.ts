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
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { MoviesPublicOutputDto } from '@/movies/api/dtos/output/movie-public.output.dto';

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
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(GetPublicCartoonsQueryHandler.name);
  }

  private async signUrlWithCache(
    url: string | null | undefined,
    cache: Map<string, Promise<string | null>>,
  ): Promise<string | null> {
    if (!url) return null;

    if (!cache.has(url)) {
      cache.set(
        url,
        this.downloaderServiceAdapter.signMediaUrl(url, 3600).catch(error => {
          this.logger.error(error, this.signUrlWithCache.name);
          return url;
        }),
      );
    }

    return cache.get(url)!;
  }

  private async signListItems(items: MoviesPublicOutputDto[]): Promise<MoviesPublicOutputDto[]> {
    const cache = new Map<string, Promise<string | null>>();

    return Promise.all(
      items.map(async item => {
        const [previewUrl, cardImg] = await Promise.all([
          this.signUrlWithCache(item.previewUrl, cache),
          this.signUrlWithCache(item.cardImg, cache),
        ]);

        return {
          ...item,
          previewUrl: previewUrl ?? item.previewUrl,
          cardImg: cardImg ?? item.cardImg,
        };
      }),
    );
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

        const mappedItems =
          cartoons && cartoons.length > 0
            ? this.cartoonsPublicOutputDtoMapper.mapAllPublicMovies(cartoons)
            : [];
        const signedItems = await this.signListItems(mappedItems);

        const result = this.paginationUtil.create(
          cartoons?.length || 0,
          1,
          normalizedPage,
          normalizedSize,
          signedItems,
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

      const mappedItems =
        cartoons && cartoons.length > 0
          ? this.cartoonsPublicOutputDtoMapper.mapAllPublicMovies(cartoons)
          : [];
      const signedItems = await this.signListItems(mappedItems);

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        normalizedPage,
        normalizedSize,
        signedItems,
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
