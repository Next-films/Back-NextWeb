import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { ConverterLogs } from '@/converter-logs/domain/converter-logs.entity';
import { ConverterLogsRepository } from '@/converter-logs/infrastructure/converter-logs.repository';
import { UploadedLogFilePayloadDto } from '@/converter-logs/api/dtos/input/create-converter-log-file.input.dto';

export class CreateConverterLogCommand implements ICommand {
  constructor(public inputDto: UploadedLogFilePayloadDto) {}
}

@CommandHandler(CreateConverterLogCommand)
export class CreateConverterLogCommandHandler
  implements ICommandHandler<CreateConverterLogCommand, AppNotificationResult<null>>
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly converterLogsRepository: ConverterLogsRepository,
    @Inject(ConverterLogs.name) private readonly converterLogsEntity: typeof ConverterLogs,
  ) {
    this.logger.setContext(CreateConverterLogCommandHandler.name);
  }

  async execute(command: CreateConverterLogCommand): Promise<AppNotificationResult<null>> {
    const { inputDto } = command;
    const { movieKpId, keys } = inputDto;
    this.logger.log(`Create converter logs command`, this.execute.name);
    try {
      const logs: ConverterLogs[] = [];
      for (const key of keys) {
        const log = this.converterLogsEntity.create(movieKpId, key);

        logs.push(log);
      }

      await this.converterLogsRepository.saveMany(logs);
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
