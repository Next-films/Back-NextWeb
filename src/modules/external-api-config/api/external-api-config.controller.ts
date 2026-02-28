import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiConfigInputQueryDto } from '@/external-api-config/api/dtos/external-api-config.input-query.dto';
import {
  ExternalApiConfigOutputDto,
  ExternalApiConfigOutputDtoMapper,
} from '@/external-api-config/api/dtos/external-api-config.output.dto';
import { ExternalApiConfigSyncInputDto } from '@/external-api-config/api/dtos/external-api-config-sync.input.dto';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@UseFilters(HttpPrivateExceptionsFilter)
@ApiTags('External api configs. Only for interaction between backends')
@Controller(`${EXTERNAL_API_ROUTE.MAIN}/${EXTERNAL_API_ROUTE.CONFIG}`)
export class ExternalApiConfigController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly externalApiConfigService: ExternalApiConfigService,
    private readonly mapper: ExternalApiConfigOutputDtoMapper,
  ) {
    this.logger.setContext(ExternalApiConfigController.name);
  }

  @Get()
  async getConfig(
    @Query() query: ExternalApiConfigInputQueryDto,
  ): Promise<
    AppNotificationResult<ExternalApiConfigOutputDto | null, ErrorFieldExceptionDto | null>
  > {
    this.logger.log('Get external api config', this.getConfig.name);

    const config = await this.externalApiConfigService.getActiveConfig(
      query.provider,
      query.target,
    );

    const data = config ? this.mapper.mapConfig(config) : null;
    return this.appNotification.success(data);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(EXTERNAL_API_ROUTE.SYNC)
  async syncConfigs(
    @Body() body: ExternalApiConfigSyncInputDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log('Sync external api configs', this.syncConfigs.name);
    await this.externalApiConfigService.syncConfigs(body.configs || []);
    return this.appNotification.success(null);
  }
}
