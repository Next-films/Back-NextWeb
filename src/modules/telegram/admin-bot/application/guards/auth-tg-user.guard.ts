import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { TelegramIncomingMessage } from '@/telegram/admin-bot/domain/types';

export class AuthAdminTgUserCommand implements ICommand {
  constructor(public msg: TelegramIncomingMessage) {}
}

@CommandHandler(AuthAdminTgUserCommand)
export class AuthAdminTgUserHandler
  implements
    ICommandHandler<
      AuthAdminTgUserCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly adminRepository: AdminRepository,
  ) {}

  async execute(
    command: AuthAdminTgUserCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log('Auth tg user command', this.execute.name);
    const { msg } = command;
    const { from } = msg;

    try {
      const chatId = from?.id;

      if (!chatId)
        return this.appNotification.unauthorized({
          field: 'userId',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });

      const user = await this.adminRepository.getAdminByTelegramId(String(chatId));

      if (!user)
        return this.appNotification.unauthorized({
          field: 'userId',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });

      return this.appNotification.success(null);
    } catch (error) {
      this.logger.error(error, this.execute.name);

      return this.appNotification.internalServerError();
    }
  }
}
