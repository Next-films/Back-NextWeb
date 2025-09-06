import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  AdminRolesOutputDto,
  AdminRolesOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-roles.output.dto';
import { AdminRoleQueryRepository } from '@/admin/infrastructure/admin-role.query.repository';

export class AdminGetAllAdminRolesQuery implements IQuery {
  constructor() {}
}

@QueryHandler(AdminGetAllAdminRolesQuery)
export class AdminGetAllAdminRolesQueryHandler
  implements
    IQueryHandler<
      AdminGetAllAdminRolesQuery,
      AppNotificationResult<AdminRolesOutputDto[], ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminRolesOutputDtoMapper: AdminRolesOutputDtoMapper,
    private readonly adminRoleQueryRepository: AdminRoleQueryRepository,
  ) {
    this.logger.setContext(AdminGetAllAdminRolesQueryHandler.name);
  }

  async execute(): Promise<
    AppNotificationResult<AdminRolesOutputDto[], ErrorFieldExceptionDto | null>
  > {
    this.logger.log(`Get all admin roles command`, this.execute.name);
    try {
      const roles = await this.adminRoleQueryRepository.getRoles();

      return this.appNotification.success(this.adminRolesOutputDtoMapper.mapEntities(roles || []));
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
