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
import { AdminUpdateInputDto } from '@/admin/api/dtos/input/admin-update.input.dto';

export class AdminUpdateCommand implements ICommand {
  constructor(
    public inputDto: AdminUpdateInputDto,
    public userId: number,
    public currentUserId: number,
  ) {}
}

@CommandHandler(AdminUpdateCommand)
export class AdminUpdateCommandHandler
  implements
    ICommandHandler<AdminUpdateCommand, AppNotificationResult<null, ErrorFieldExceptionDto | null>>
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly adminRepository: AdminRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminUpdateCommandHandler.name);
  }
  async execute(
    command: AdminUpdateCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto, userId, currentUserId } = command;
    const { username, tgId, email } = inputDto;
    this.logger.log(`Admin update command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const tasks = [this.adminRepository.getAdminByIdWithTelegramInfo(userId, queryRunner)];

      if (userId !== currentUserId) {
        tasks.push(this.adminRepository.getAdminByIdWithRoleInfo(currentUserId, queryRunner));
      }

      const [admin, currentAdmin] = await Promise.all(tasks);

      if (userId !== currentUserId) {
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
      }

      if (!admin) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'id',
          message: 'User not found',
          errorKey: EXCEPTION_KEYS_ENUM.USER_NOT_FOUND,
        });
      }

      admin.updateAdmin(username, email, tgId);
      await this.adminRepository.updateProfile(admin, queryRunner);

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
