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
import { AdminRoleRepository } from '@/admin/infrastructure/admin-role.repository';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export class AdminRegisterCommand implements ICommand {
  constructor(
    public inputModel: AdminRegisterInputModel,
    public currentUserId: number,
  ) {}
}

@CommandHandler(AdminRegisterCommand)
export class AdminRegisterHandler
  implements
    ICommandHandler<
      AdminRegisterCommand,
      AppNotificationResult<number | null, ValidationErrorsDto | null>
    >
{
  private readonly salt_round: number;
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly adminRoleRepository: AdminRoleRepository,
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
  ): Promise<AppNotificationResult<number | null, ValidationErrorsDto | null>> {
    this.logger.debug('Execute: register new admin command', this.execute.name);

    const { inputModel, currentUserId } = command;
    const { password, email, username, telegramId, roles } = inputModel;
    try {
      const [admin, currentAdmin] = await Promise.all([
        this.adminAuthRepository.getAdminByEmailOrUsernameOrTgId(email, username, telegramId),
        this.adminAuthRepository.getAdminById(currentUserId),
      ]);

      if (
        !currentAdmin ||
        !currentAdmin.isActive ||
        !currentAdmin.roles.some(role => role.name === AdminRoleEnum.ADMIN)
      ) {
        return this.appNotification.forbidden({
          errorsMessages: [
            {
              field: 'id',
              message: 'No access',
              errorKey: EXCEPTION_KEYS_ENUM.NO_ACCESS,
            },
          ],
        });
      }

      if (admin) return this.generateBadRequest(admin, email, username, telegramId);

      const [hashPassword, adminRoles] = await Promise.all([
        this.bcryptService.generateHash(password, this.salt_round),
        this.adminRoleRepository.getRolesByNames(roles),
      ]);

      if (!adminRoles)
        return this.appNotification.notFound({
          errorsMessages: [
            {
              message: 'Role not found',
              errorKey: EXCEPTION_KEYS_ENUM.ROLE_NOT_FOUND,
              field: 'roles',
            },
          ],
        });

      const newAdmin = this.adminEntity.create(
        email,
        username,
        hashPassword,
        telegramId,
        adminRoles,
      );

      const newAdminId = await this.adminAuthRepository.save(newAdmin);

      return this.appNotification.success(newAdminId);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private generateBadRequest(
    admin: Admin,
    email: string,
    username: string,
    telegramId: string,
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
    if (admin.adminTelegram.telegramId === telegramId) {
      errorsMessages.push({
        message: 'Telegram id already exists',
        field: 'telegramId',
        errorKey: EXCEPTION_KEYS_ENUM.TELEGRAM_ID_IS_EXIST,
      });
    }

    return this.appNotification.badRequest({ errorsMessages });
  }
}
