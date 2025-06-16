import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { ExternalApiAuthQueryRepository } from '@/external-auth/infrastructure/external-api-auth.query-repository';
import {
  ExternalApiTokenOutputModelMapper,
  ExternalApiTokenOutputDto,
} from '@/admin/api/dtos/output/external-api-tokens.output.dto';
import { GetAllExternalTokensInputQueryDto } from '@/admin/api/dtos/input/get-all-external-tokens.input-query.dto';

export class AdminGetAllExternalTokensQuery implements IQuery {
  constructor(public query: GetAllExternalTokensInputQueryDto) {}
}

@QueryHandler(AdminGetAllExternalTokensQuery)
export class AdminGetAllExternalTokensQueryHandler
  implements
    IQueryHandler<
      AdminGetAllExternalTokensQuery,
      AppNotificationResult<
        PaginationUtil<ExternalApiTokenOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly externalApiAuthQueryRepository: ExternalApiAuthQueryRepository,
    private readonly externalApiTokenOutputModelMapper: ExternalApiTokenOutputModelMapper,
  ) {
    this.logger.setContext(AdminGetAllExternalTokensQueryHandler.name);
  }

  async execute(
    query: AdminGetAllExternalTokensQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<ExternalApiTokenOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all external tokens`, this.execute.name);
    const { searchName, page, size } = query.query;
    try {
      const totalCount = await this.externalApiAuthQueryRepository.getTokensCount(
        searchName || null,
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
      const tokens = await this.externalApiAuthQueryRepository.getTokens(
        skip,
        size,
        searchName || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        tokens ? this.externalApiTokenOutputModelMapper.mapTokens(tokens) : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
