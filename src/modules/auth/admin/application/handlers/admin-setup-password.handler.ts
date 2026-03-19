import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { BcryptService } from '@/bcrypt-module/application/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';

export class AdminSetupPasswordCommand implements ICommand {
  constructor(
    public readonly adminId: number,
    public readonly password: string,
  ) {}
}

@CommandHandler(AdminSetupPasswordCommand)
export class AdminSetupPasswordHandler
  implements
    ICommandHandler<
      AdminSetupPasswordCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  private readonly saltRound: number;

  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly bcryptService: BcryptService,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(AdminSetupPasswordHandler.name);
    this.saltRound = this.configService.get('businessRulesSettings', {
      infer: true,
    }).ADMIN_HASH_SALT_ROUND;
  }

  async execute(
    command: AdminSetupPasswordCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log('Setup admin password command', this.execute.name);

    const { adminId, password } = command;

    try {
      const admin = await this.adminAuthRepository.getAdminById(adminId);

      if (!admin || !admin.isActive) {
        return this.appNotification.notFound({
          field: 'id',
          message: 'User not found',
          errorKey: EXCEPTION_KEYS_ENUM.USER_NOT_FOUND,
        });
      }

      const hashPassword = await this.bcryptService.generateHash(password, this.saltRound);
      admin.updatePassword(hashPassword);
      await this.adminAuthRepository.save(admin);

      return this.appNotification.success(null);
    } catch (error) {
      this.logger.error(error, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
