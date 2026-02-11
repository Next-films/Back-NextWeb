import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { AdminGetAllExternalApiConfigInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-external-api-config.input-query.dto';
import {
  AdminExternalApiConfigOutputDto,
  AdminExternalApiConfigOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-external-api-config.output.dto';
import { ExternalApiConfigQueryRepository } from '@/external-api-config/infrastructure/external-api-config.query-repository';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';

export class AdminGetAllExternalApiConfigQuery implements IQuery {
  constructor(public query: AdminGetAllExternalApiConfigInputQueryDto) {}
}

@QueryHandler(AdminGetAllExternalApiConfigQuery)
export class AdminGetAllExternalApiConfigQueryHandler
  implements
    IQueryHandler<
      AdminGetAllExternalApiConfigQuery,
      AppNotificationResult<
        PaginationUtil<AdminExternalApiConfigOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly externalApiConfigQueryRepository: ExternalApiConfigQueryRepository,
    private readonly mapper: AdminExternalApiConfigOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetAllExternalApiConfigQueryHandler.name);
  }

  async execute(
    query: AdminGetAllExternalApiConfigQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminExternalApiConfigOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log('Get all external api configs', this.execute.name);
    const { page, size, sortField, sortDirection, provider, target } = query.query;

    try {
      const allowedSortFields: Array<keyof ExternalApiConfigEntity> = [
        'id',
        'provider',
        'target',
        'baseUrl',
        'token',
        'isEnabled',
        'createdAt',
        'updatedAt',
      ];
      const safeSortField: keyof ExternalApiConfigEntity =
        typeof sortField === 'string' &&
        allowedSortFields.includes(sortField as keyof ExternalApiConfigEntity)
          ? (sortField as keyof ExternalApiConfigEntity)
          : 'updatedAt';

      const totalCount = await this.externalApiConfigQueryRepository.getConfigsCount(
        provider,
        target,
      );
      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);
      const isValidPage = this.paginationUtil.isValidPage(page, pagesCount, totalCount);

      if (!isValidPage) {
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });
      }

      const skip = this.paginationUtil.calculatePaginationSkip(page, size);
      const configs = await this.externalApiConfigQueryRepository.getConfigs(
        safeSortField,
        sortDirection || SortDirectionEnum.DESC,
        skip,
        size,
        provider,
        target,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        configs ? this.mapper.mapConfigs(configs) : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
