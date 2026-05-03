import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialPublicQueryRepository } from '@/serials/infrastructure/serial-public.query-repository';
import {
  SerialsOutputDto,
  SerialsOutputDtoMapper,
} from '@/serials/api/dtos/output/serials.output.dto';
import { GetSerialInputQuery } from '@/serials/api/dtos/input/get-serial.input-query';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

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
    private readonly serialQueryRepository: SerialPublicQueryRepository,
    private readonly serialsOutputDtoMapper: SerialsOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(GetSerialsQueryHandler.name);
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

  private async signListItems(items: SerialsOutputDto[]): Promise<SerialsOutputDto[]> {
    const cache = new Map<string, Promise<string | null>>();

    return Promise.all(
      items.map(async item => {
        const [cardImg, backgroundImg, titleImg, trailerUrl] = await Promise.all([
          this.signUrlWithCache(item.cardImg, cache),
          this.signUrlWithCache(item.backgroundImg, cache),
          this.signUrlWithCache(item.titleImg, cache),
          this.signUrlWithCache(item.trailerUrl, cache),
        ]);

        return {
          ...item,
          cardImg: cardImg ?? item.cardImg,
          backgroundImg: backgroundImg ?? item.backgroundImg,
          titleImg: titleImg ?? item.titleImg,
          trailerUrl: trailerUrl ?? item.trailerUrl,
        };
      }),
    );
  }

  async execute(
    query: GetSerialsQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<SerialsOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    const { page, size, sortField, sortDirection, searchName, searchGenreIds } = query.query;
    const normalizedPage = typeof page === 'number' && Number.isFinite(page) ? page : 1;
    const normalizedSize = typeof size === 'number' && Number.isFinite(size) ? size : 50;
    const isFastHomeQuery =
      normalizedPage === 1 &&
      normalizedSize <= 12 &&
      !searchName &&
      (!searchGenreIds || searchGenreIds.length === 0);
    this.logger.log(`Get serials command`, this.execute.name);
    try {
      if (isFastHomeQuery) {
        const serials = await this.serialQueryRepository.getSerials(
          sortField,
          sortDirection,
          0,
          normalizedSize,
          null,
          null,
          false,
          false,
        );

        const mappedItems =
          serials && serials.length > 0 ? this.serialsOutputDtoMapper.mapSerials(serials) : [];
        const signedItems = await this.signListItems(mappedItems);

        const result = this.paginationUtil.create(
          serials?.length || 0,
          1,
          normalizedPage,
          normalizedSize,
          signedItems,
        );

        return this.appNotification.success(result);
      }

      const totalCount = await this.serialQueryRepository.getSerialCount(
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

      const serials = await this.serialQueryRepository.getSerials(
        sortField,
        sortDirection,
        skip,
        normalizedSize,
        searchName || null,
        searchGenreIds || null,
      );

      const mappedItems =
        serials && serials.length > 0 ? this.serialsOutputDtoMapper.mapSerials(serials) : [];
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
