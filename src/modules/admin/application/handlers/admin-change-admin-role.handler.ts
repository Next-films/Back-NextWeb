import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { AdminChangeAdminRolesInputDto } from '@/admin/api/dtos/input/admin-change-admin-roles.input.dto';
import { AdminRoleRepository } from '@/admin/infrastructure/admin-role.repository';

export class AdminChangeAdminRoleCommand implements ICommand {
  constructor(
    public inputDto: AdminChangeAdminRolesInputDto,
    public userId: number,
    public currentUserId: number,
  ) {}
}

@CommandHandler(AdminChangeAdminRoleCommand)
export class AdminChangeAdminRoleCommandHandler
  implements
    ICommandHandler<
      AdminChangeAdminRoleCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly adminRepository: AdminRepository,
    private readonly adminRoleRepository: AdminRoleRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminChangeAdminRoleCommandHandler.name);
  }
  async execute(
    command: AdminChangeAdminRoleCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto, userId, currentUserId } = command;
    const { roles: rolesNames } = inputDto;
    this.logger.log(`Admin change admin roles command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const [admin, currentAdmin, roles] = await Promise.all([
        this.adminRepository.getAdminByIdWithRoleInfo(userId, queryRunner),
        this.adminRepository.getAdminByIdWithRoleInfo(currentUserId, queryRunner),
        this.adminRoleRepository.getRolesByNames(rolesNames, queryRunner),
      ]);

      if (
        !currentAdmin ||
        !currentAdmin.isActive ||
        !currentAdmin.roles.some(role => role.name === AdminRoleEnum.ADMIN) ||
        currentUserId === userId
      ) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.forbidden({
          field: 'id',
          message: 'No access',
          errorKey: EXCEPTION_KEYS_ENUM.NO_ACCESS,
        });
      }

      if (!admin) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'id',
          message: 'User not found',
          errorKey: EXCEPTION_KEYS_ENUM.USER_NOT_FOUND,
        });
      }

      if (!roles) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'roles',
          message: 'Roles not found',
          errorKey: EXCEPTION_KEYS_ENUM.ROLE_NOT_FOUND,
        });
      }

      admin.updateRoles(roles);
      await this.adminRepository.save(admin, queryRunner);

      await queryRunner.commitTransaction();
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();
      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }
}
