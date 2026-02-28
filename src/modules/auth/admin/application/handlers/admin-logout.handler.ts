import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';

export class AdminLogoutCommand implements ICommand {
  constructor(public deviceId: string) {}
}

@CommandHandler(AdminLogoutCommand)
export class AdminLogoutHandler
  implements ICommandHandler<AdminLogoutCommand, AppNotificationResult<null>>
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthSessionRepository: AdminAuthSessionRepository,
  ) {
    this.logger.setContext(AdminLogoutHandler.name);
  }
  async execute(command: AdminLogoutCommand): Promise<AppNotificationResult<null>> {
    this.logger.log('Logout admin command', this.execute.name);
    const { deviceId } = command;
    try {
      await this.adminAuthSessionRepository.removeSessionByDeviceId(deviceId);
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
