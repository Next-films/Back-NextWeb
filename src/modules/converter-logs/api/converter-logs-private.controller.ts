import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { CreateConverterLogCommand } from '@/converter-logs/application/handlers/create-converter-log.handler';
import { UploadedLogFilePayloadDto } from '@/converter-logs/api/dtos/input/create-converter-log-file.input.dto';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { PRIVATE_CONVERTER_LOGS_ROUTE } from '@/common/constants/route.constants';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';
import { SwaggerDecoratorSaveConverterLogs } from '@/converter-logs/api/swagger/save-logs-private.swagger.decorator';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@ApiTags('Private - converter logs. Only for interaction between backends')
@UseFilters(HttpPrivateExceptionsFilter)
@Controller(PRIVATE_CONVERTER_LOGS_ROUTE.MAIN)
export class ConverterLogsPrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(ConverterLogsPrivateController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SwaggerDecoratorSaveConverterLogs()
  async saveLog(
    @Body() body: UploadedLogFilePayloadDto,
  ): Promise<AppNotificationResult<null> | void> {
    this.logger.log(`Execute: Save converter log`, this.saveLog.name);

    const result = await this.commandBus.execute<
      CreateConverterLogCommand,
      AppNotificationResult<null>
    >(new CreateConverterLogCommand(body));

    this.logger.log(result.appResult, this.saveLog.name);

    return this.appNotification.handleHttpResult(result, true);
  }
}
