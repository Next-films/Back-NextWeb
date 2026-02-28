import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ExternalApiAuthRepository } from '@/external-auth/infrastructure/external-api-auth.repository';

export class AdminRemoveExternalApiTokenCommand implements ICommand {
  constructor(public tokenId: number) {}
}

@CommandHandler(AdminRemoveExternalApiTokenCommand)
export class AdminRemoveExternalApiTokenCommandHandler
  implements
    ICommandHandler<
      AdminRemoveExternalApiTokenCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly externalApiAuthRepository: ExternalApiAuthRepository,
  ) {
    this.logger.setContext(AdminRemoveExternalApiTokenCommandHandler.name);
  }
  async execute(
    command: AdminRemoveExternalApiTokenCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { tokenId } = command;
    this.logger.log(`Remove external api token command`, this.execute.name);
    try {
      const token = await this.externalApiAuthRepository.getTokenById(tokenId);

      if (!token)
        return this.appNotification.notFound({
          field: 'tokenId',
          message: 'Token not found',
          errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_NOT_FOUND,
        });

      await this.externalApiAuthRepository.removeById(tokenId);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
