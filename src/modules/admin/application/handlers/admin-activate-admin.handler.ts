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

export class AdminActivateAdminCommand implements ICommand {
  constructor(
    public userId: number,
    public currentUserId: number,
  ) {}
}

@CommandHandler(AdminActivateAdminCommand)
export class AdminActivateAdminCommandHandler
  implements
    ICommandHandler<
      AdminActivateAdminCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly adminRepository: AdminRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminActivateAdminCommandHandler.name);
  }
  async execute(
    command: AdminActivateAdminCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { userId, currentUserId } = command;
    this.logger.log(`Admin activate admin command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const [admin, currentAdmin] = await Promise.all([
        this.adminRepository.getAdminById(userId, queryRunner),
        this.adminRepository.getAdminByIdWithRoleInfo(currentUserId, queryRunner),
      ]);

      if (
        !currentAdmin ||
        !currentAdmin.isActive ||
        !currentAdmin.roles.some(role => role.name === AdminRoleEnum.ADMIN)
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

      if (!admin.isActive) {
        admin.activate();
        await this.adminRepository.save(admin, queryRunner);
      }

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
