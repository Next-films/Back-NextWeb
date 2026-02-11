import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigRepository } from '@/external-api-config/infrastructure/external-api-config.repository';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { AdminExternalApiConfigCreateInputDto } from '@/admin/api/dtos/input/admin-external-api-config.input.dto';
import {
  AdminExternalApiConfigOutputDto,
  AdminExternalApiConfigOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-external-api-config.output.dto';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';

export class AdminCreateExternalApiConfigCommand implements ICommand {
  constructor(public inputDto: AdminExternalApiConfigCreateInputDto) {}
}

@CommandHandler(AdminCreateExternalApiConfigCommand)
export class AdminCreateExternalApiConfigCommandHandler
  implements
    ICommandHandler<
      AdminCreateExternalApiConfigCommand,
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
    this.logger.setContext(AdminCreateExternalApiConfigCommandHandler.name);
  }

  async execute(
    command: AdminCreateExternalApiConfigCommand,
  ): Promise<
    AppNotificationResult<AdminExternalApiConfigOutputDto, ErrorFieldExceptionDto | null>
  > {
    this.logger.log('Create external api config by admin', this.execute.name);
    const { inputDto } = command;

    const entity = new ExternalApiConfigEntity();
    entity.provider = inputDto.provider;
    entity.target = inputDto.target;
    entity.baseUrl = inputDto.baseUrl;
    entity.token = inputDto.token ?? null;
    entity.isEnabled = inputDto.isEnabled ?? true;

    const saved = await this.externalApiConfigRepository.save(entity);
    this.externalApiConfigService.clearCache();
    return this.appNotification.success(this.mapper.mapConfig(saved));
  }
}
