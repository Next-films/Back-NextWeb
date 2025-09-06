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
  AdminGetAllAdminOutputDto,
  AdminGetAllAdminOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';
import { AdminQueryRepository } from '@/admin/infrastructure/admin.query.repository';
import { GetAllAdminInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-admins.input-query.dto';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export class AdminGetAllAdminsQuery implements IQuery {
  constructor(
    public query: GetAllAdminInputQueryDto,
    public currentUserId: number,
  ) {}
}

@QueryHandler(AdminGetAllAdminsQuery)
export class AdminGetAllAdminsQueryHandler
  implements
    IQueryHandler<
      AdminGetAllAdminsQuery,
      AppNotificationResult<
        PaginationUtil<AdminGetAllAdminOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    private readonly adminGetAllAdminOutputDtoMapper: AdminGetAllAdminOutputDtoMapper,
    private readonly adminQueryRepository: AdminQueryRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    this.logger.setContext(AdminGetAllAdminsQueryHandler.name);
  }

  async execute(
    query: AdminGetAllAdminsQuery,
  ): Promise<
    AppNotificationResult<
      PaginationUtil<AdminGetAllAdminOutputDto[]>,
      ErrorFieldExceptionDto | null
    >
  > {
    this.logger.log(`Get all admins command`, this.execute.name);
    const { currentUserId } = query;
    const { page, size, searchUsername, searchEmail, sortField, sortDirection, searchRole } =
      query.query;
    try {
      const currentAdmin = await this.adminRepository.getAdminByIdWithRoleInfo(currentUserId);

      if (
        !currentAdmin ||
        !currentAdmin.isActive ||
        !currentAdmin.roles.some(role => role.name === AdminRoleEnum.ADMIN)
      ) {
        return this.appNotification.forbidden({
          field: 'id',
          message: 'No access',
          errorKey: EXCEPTION_KEYS_ENUM.NO_ACCESS,
        });
      }

      const totalCount = await this.adminQueryRepository.getAdminsCount(
        searchUsername || null,
        searchEmail || null,
        searchRole || null,
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
      const admins = await this.adminQueryRepository.getAdminsByFilter(
        skip,
        size,
        sortField,
        sortDirection,
        searchUsername || null,
        searchEmail || null,
        searchRole || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        admins ? this.adminGetAllAdminOutputDtoMapper.mapEntities(admins) : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
