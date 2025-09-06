import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  AdminGetAllAdminOutputDto,
  AdminGetAllAdminOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';
import { AdminQueryRepository } from '@/admin/infrastructure/admin.query.repository';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export class AdminGetAdminByIdQuery implements IQuery {
  constructor(
    public userId: number,
    public currentUserId: number,
  ) {}
}

@QueryHandler(AdminGetAdminByIdQuery)
export class AdminGetAdminByIdQueryHandler
  implements
    IQueryHandler<
      AdminGetAdminByIdQuery,
      AppNotificationResult<AdminGetAllAdminOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminGetAllAdminOutputDtoMapper: AdminGetAllAdminOutputDtoMapper,
    private readonly adminQueryRepository: AdminQueryRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    this.logger.setContext(AdminGetAdminByIdQueryHandler.name);
  }

  async execute(
    query: AdminGetAdminByIdQuery,
  ): Promise<AppNotificationResult<AdminGetAllAdminOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Get admin by id command`, this.execute.name);
    const { currentUserId, userId } = query;
    try {
      if (userId !== currentUserId) {
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
      }

      const admin = await this.adminQueryRepository.getAdminById(userId);

      if (!admin)
        return this.appNotification.notFound({
          field: 'id',
          message: 'User not found',
          errorKey: EXCEPTION_KEYS_ENUM.USER_NOT_FOUND,
        });

      return this.appNotification.success(this.adminGetAllAdminOutputDtoMapper.mapEntity(admin));
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
