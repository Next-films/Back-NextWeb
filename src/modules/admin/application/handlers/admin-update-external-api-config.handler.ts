import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigRepository } from '@/external-api-config/infrastructure/external-api-config.repository';
import { AdminExternalApiConfigUpdateInputDto } from '@/admin/api/dtos/input/admin-external-api-config.input.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  AdminExternalApiConfigOutputDto,
  AdminExternalApiConfigOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-external-api-config.output.dto';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';

export class AdminUpdateExternalApiConfigCommand implements ICommand {
  constructor(
    public configId: number,
    public inputDto: AdminExternalApiConfigUpdateInputDto,
  ) {}
}

@CommandHandler(AdminUpdateExternalApiConfigCommand)
export class AdminUpdateExternalApiConfigCommandHandler
  implements
    ICommandHandler<
      AdminUpdateExternalApiConfigCommand,
      AppNotificationResult<AdminExternalApiConfigOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly externalApiConfigRepository: ExternalApiConfigRepository,
    private readonly externalApiConfigService: ExternalApiConfigService,
    private readonly mapper: AdminExternalApiConfigOutputDtoMapper,
  ) {
    this.logger.setContext(AdminUpdateExternalApiConfigCommandHandler.name);
  }

  async execute(
    command: AdminUpdateExternalApiConfigCommand,
  ): Promise<
    AppNotificationResult<AdminExternalApiConfigOutputDto, ErrorFieldExceptionDto | null>
  > {
    this.logger.log('Update external api config by admin', this.execute.name);
    const { configId, inputDto } = command;

    const config = await this.externalApiConfigRepository.getById(configId);
    if (!config) {
      return this.appNotification.notFound({
        field: 'configId',
        message: 'Config not found',
        errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_NOT_FOUND,
      });
    }

    if (inputDto.provider) config.provider = inputDto.provider;
    if (inputDto.target) config.target = inputDto.target;
    if (inputDto.baseUrl) config.baseUrl = inputDto.baseUrl;
    if (inputDto.token !== undefined) config.token = inputDto.token;
    if (inputDto.isEnabled !== undefined) config.isEnabled = inputDto.isEnabled;

    const saved = await this.externalApiConfigRepository.save(config);
    this.externalApiConfigService.clearCache();
    return this.appNotification.success(this.mapper.mapConfig(saved));
  }
}
