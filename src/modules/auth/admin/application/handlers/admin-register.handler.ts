import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { AdminRegisterInputModel } from '@/admin-auth/api/dtos/input/admin-register.input.model';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { Admin } from '@/admin/domain/admin.entity';
import { Inject } from '@nestjs/common';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { AdminRoleRepository } from '@/admin/infrastructure/admin-role.repository';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';

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
  private readonly mainTelegramGroupChatId: string;

  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly adminRoleRepository: AdminRoleRepository,
    private readonly botService: TelegramAdminBotService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    @Inject(Admin.name) private readonly adminEntity: typeof Admin,
  ) {
    this.logger.setContext(AdminRegisterHandler.name);
    this.mainTelegramGroupChatId = this.configService.get('apiSettings', {
      infer: true,
    }).MAIN_TELEGRAM_GROUP_CHAT_ID;
  }
  async execute(
    command: AdminRegisterCommand,
  ): Promise<AppNotificationResult<number | null, ValidationErrorsDto | null>> {
    this.logger.debug('Execute: register new admin command', this.execute.name);

    const { inputModel, currentUserId } = command;
    const { username, telegramUsername, roles } = inputModel;
    const normalizedTgUsername = telegramUsername.trim().replace(/^@/, '');

    try {
      await this.adminAuthRepository.deleteExpiredPasswordSetupAdmins();

      const [admin, currentAdmin] = await Promise.all([
        this.adminAuthRepository.getAdminByEmailOrUsername(
          this.getPlaceholderEmail(username),
          username,
        ),
        this.adminAuthRepository.getAdminById(currentUserId),
      ]);

      const adminByTgUsername = await this.adminAuthRepository.getAdminByTelegramUsername(
        normalizedTgUsername,
      );

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

      if (admin || adminByTgUsername) return this.generateBadRequest(!!admin, !!adminByTgUsername);

      const adminRoles = await this.adminRoleRepository.getRolesByNames(roles);

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

      const passwordSetupDeadlineAt = new Date(Date.now() + 60 * 60 * 1000);
      const pendingTelegramId = `pending:${normalizedTgUsername}:${Date.now()}`;
      const newAdmin = this.adminEntity.create(
        this.getPlaceholderEmail(username),
        username,
        null,
        pendingTelegramId,
        normalizedTgUsername,
        adminRoles,
        passwordSetupDeadlineAt,
      );

      const newAdminId = await this.adminAuthRepository.save(newAdmin);
      await this.botService.sendHtmlMessage(
        {
          chatId: `@${normalizedTgUsername}`,
          template: ADMIN_BOT_TEMPLATES_NAME_ENUM.INVITE_ACCOUNT,
        },
        {
          username,
          role: roles.join(', '),
          expiresAt: passwordSetupDeadlineAt.toLocaleString('ru-RU'),
        },
      );

      await this.botService.sendHtmlMessage(
        {
          chatId: Number(this.mainTelegramGroupChatId),
          template: ADMIN_BOT_TEMPLATES_NAME_ENUM.INVITE_ACCOUNT_GROUP,
        },
        {
          telegramUsername: normalizedTgUsername,
          role: roles.join(', '),
        },
      );

      return this.appNotification.success(newAdminId);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private getPlaceholderEmail(username: string): string {
    const normalized = username.toLowerCase();
    return `${normalized}@pending.local`;
  }

  private generateBadRequest(
    hasByUsername: boolean,
    hasByTgUsername: boolean,
  ): AppNotificationResult<null, ValidationErrorsDto> {
    const errorsMessages: ErrorFieldExceptionDto[] = [];

    if (hasByUsername) {
      errorsMessages.push({
        message: 'Username already exists',
        field: 'username',
        errorKey: EXCEPTION_KEYS_ENUM.USERNAME_IS_EXIST,
      });
    }
    if (hasByTgUsername) {
      errorsMessages.push({
        message: 'Telegram username already exists',
        field: 'telegramUsername',
        errorKey: EXCEPTION_KEYS_ENUM.TELEGRAM_ID_IS_EXIST,
      });
    }

    return this.appNotification.badRequest({ errorsMessages });
  }
}
