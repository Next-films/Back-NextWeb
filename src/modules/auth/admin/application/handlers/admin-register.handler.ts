import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { AdminRegisterInputModel } from '@/admin-auth/api/dtos/input/admin-register.input.model';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { BcryptService } from '@/bcrypt-module/application/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { Admin } from '@/admin/domain/admin.entity';
import { Inject } from '@nestjs/common';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';

export class AdminRegisterCommand implements ICommand {
  constructor(public inputModel: AdminRegisterInputModel) {}
}

@CommandHandler(AdminRegisterCommand)
export class AdminRegisterHandler
  implements
    ICommandHandler<AdminRegisterCommand, AppNotificationResult<null, ValidationErrorsDto | null>>
{
  private readonly salt_round: number;
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly bcryptService: BcryptService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    @Inject(Admin.name) private readonly adminEntity: typeof Admin,
  ) {
    this.logger.setContext(AdminRegisterHandler.name);
    this.salt_round = this.configService.get('businessRulesSettings', {
      infer: true,
    }).ADMIN_HASH_SALT_ROUND;
  }
  async execute(
    command: AdminRegisterCommand,
  ): Promise<AppNotificationResult<null, ValidationErrorsDto | null>> {
    this.logger.debug('Execute: register new admin command', this.execute.name);

    const { inputModel } = command;
    const { password, email, username } = inputModel;
    try {
      const admin = await this.adminAuthRepository.getAdminByEmailOrUsername(email, username);

      if (admin) return this.generateBadRequest(admin, email, username);

      const hashPassword = await this.bcryptService.generateHash(password, this.salt_round);

      const newAdmin = this.adminEntity.create(email, username, hashPassword);

      await this.adminAuthRepository.save(newAdmin);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private generateBadRequest(
    admin: Admin,
    email: string,
    username: string,
  ): AppNotificationResult<null, ValidationErrorsDto> {
    const errorsMessages: ErrorFieldExceptionDto[] = [];

    if (admin.email === email) {
      errorsMessages.push({
        message: 'Email address already exists',
        field: 'email',
        errorKey: EXCEPTION_KEYS_ENUM.EMAIL_IS_EXIST,
      });
    }
    if (admin.username === username) {
      errorsMessages.push({
        message: 'Username already exists',
        field: 'username',
        errorKey: EXCEPTION_KEYS_ENUM.USERNAME_IS_EXIST,
      });
    }

    return this.appNotification.badRequest({ errorsMessages });
  }
}
