import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigRepository } from '@/external-api-config/infrastructure/external-api-config.repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';

export class AdminRemoveExternalApiConfigCommand implements ICommand {
  constructor(public configId: number) {}
}

@CommandHandler(AdminRemoveExternalApiConfigCommand)
export class AdminRemoveExternalApiConfigCommandHandler
  implements
    ICommandHandler<
      AdminRemoveExternalApiConfigCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly externalApiConfigRepository: ExternalApiConfigRepository,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(AdminRemoveExternalApiConfigCommandHandler.name);
  }

  async execute(
    command: AdminRemoveExternalApiConfigCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log('Remove external api config by admin', this.execute.name);
    const { configId } = command;

    const config = await this.externalApiConfigRepository.getById(configId);
    if (!config) {
      return this.appNotification.notFound({
        field: 'configId',
        message: 'Config not found',
        errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_NOT_FOUND,
      });
    }

    await this.externalApiConfigRepository.remove(config);
    this.externalApiConfigService.clearCache();
    return this.appNotification.success(null);
  }
}
