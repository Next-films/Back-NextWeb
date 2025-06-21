import { ApiExcludeController } from '@nestjs/swagger';
import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern } from '@nestjs/microservices';
import { UPLOADED_LOG_FILES_CMD } from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { CreateConverterLogCommand } from '@/converter-logs/application/handlers/create-converter-log.handler';
import { UploadedLogFilePayloadDto } from '@/converter-logs/domain/types';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('converter-logs-rpc')
export class ConverterLogsRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(ConverterLogsRpcController.name);
  }

  @MessagePattern({ cmd: UPLOADED_LOG_FILES_CMD })
  async saveLog(@RpcPayload() payload: UploadedLogFilePayloadDto): Promise<void> {
    this.logger.log(`Execute: Save converter log (rpc)`, this.saveLog.name);

    const result = await this.commandBus.execute<
      CreateConverterLogCommand,
      AppNotificationResult<null>
    >(new CreateConverterLogCommand(payload));

    this.logger.log(result.appResult, this.saveLog.name);
  }
}
