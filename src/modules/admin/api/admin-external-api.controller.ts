import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ADMIN_EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminCreateExternalApiTokenCommand } from '@/admin/application/handlers/admin-create-external-api-token.handler';
import { ExternalApiTokenCreateInputDto } from '@/admin/api/dtos/input/external-api-token-create.input.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ExternalApiTokenCreateOutputDto } from '@/admin/api/dtos/output/external-api-token-create.output.dto';
import { GetAllExternalTokensInputQueryDto } from '@/admin/api/dtos/input/get-all-external-tokens.input-query.dto';
import { AdminGetAllExternalTokensQuery } from '@/admin/application/query-handlers/admin-get-all-external-tokens.query-handler';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { ExternalApiTokenOutputDto } from '@/admin/api/dtos/output/external-api-tokens.output.dto';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { SwaggerDecoratorExternalTokenCreate } from '@/admin/api/swagger/external-token-create.swagger.decorator';
import { SwaggerDecoratorExternalToken } from '@/admin/api/swagger/external-token.swagger.decorator';
import { AdminUpdateExternalApiTokenCommand } from '@/admin/application/handlers/admin-update-external-api-token.handler';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { ExternalApiTokenUpdateInputDto } from '@/admin/api/dtos/input/external-api-token-update.input.dto';
import { SwaggerDecoratorExternalTokenUpdate } from '@/admin/api/swagger/external-token-update.swagger.decorator';
import { AdminRemoveExternalApiTokenCommand } from '@/admin/application/handlers/admin-remove-external-api-token.handler';
import { SwaggerDecoratorExternalTokenRemove } from '@/admin/api/swagger/external-token-remove.swagger.decorator';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminAccessTokenByRoleOnlyAdminGuard } from '@/admin-auth/application/guards/jwt/admin-access-token-by-role-only-admin.guard';
import {
  DownloaderTransportModeEnum,
  DownloaderTransportModeService,
} from '@/common/services/downloader-transport-mode.service';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { SystemConnectionsStatusService } from '@/common/services/system-connections-status.service';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import {
  DownloaderRunByListInputDto,
  DownloaderTriggerScheduleDto,
  DownloaderTriggerTaskRuntimeStatusDto,
} from '@/common/types/types';

class SetDownloaderTransportInputDto {
  @IsEnum(DownloaderTransportModeEnum)
  mode: DownloaderTransportModeEnum;
}

class UpdateDownloaderTriggersInputDto {
  @IsOptional()
  @IsString()
  findFilms?: string;

  @IsOptional()
  @IsString()
  findCartoons?: string;

  @IsOptional()
  @IsString()
  findSerials?: string;

  @IsOptional()
  @IsString()
  downloadFilms?: string;

  @IsOptional()
  @IsString()
  downloadCartoons?: string;

  @IsOptional()
  @IsString()
  downloadSerials?: string;
}

class RunDownloaderByListInputDto implements DownloaderRunByListInputDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  films?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cartoons?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serials?: string[];
}

class SignMediaUrlInputDto {
  @IsString()
  url: string;

  @IsOptional()
  expiresInSec?: number;
}

type ConnectionItem = {
  key: 'webAdminBack' | 'backDownload' | 'backTelegramBot';
  title: string;
  connected: boolean;
  details?: string;
};

type ConnectionsOutputDto = {
  updatedAt: string;
  services: ConnectionItem[];
};

@ApiTags(
  'Admin external api. Handles the generation and distribution of access tokens for backend API authorization.',
)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'No access' })
@UseGuards(AdminAccessTokenGuard, AdminAccessTokenByRoleOnlyAdminGuard)
@Controller(ADMIN_EXTERNAL_API_ROUTE.MAIN)
export class AdminExternalApiController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly logger: LoggerService,
    private readonly downloaderTransportModeService: DownloaderTransportModeService,
    private readonly systemConnectionsStatusService: SystemConnectionsStatusService,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(AdminExternalApiController.name);
  }

  @Get(ADMIN_EXTERNAL_API_ROUTE.TOKEN)
  @SwaggerDecoratorExternalToken()
  async getTokens(
    @Query() query: GetAllExternalTokensInputQueryDto,
  ): Promise<PaginationUtil<ExternalApiTokenOutputDto[]> | void> {
    this.logger.log('Execute: get external api tokens by admin', this.getTokens.name);
    const result = await this.queryBus.execute<
      AdminGetAllExternalTokensQuery,
      AppNotificationResult<
        PaginationUtil<ExternalApiTokenOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllExternalTokensQuery(query));

    this.logger.log(result.appResult, this.getTokens.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Post(ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN)
  @SwaggerDecoratorExternalTokenCreate()
  async createExternalToken(
    @Body() body: ExternalApiTokenCreateInputDto,
  ): Promise<ExternalApiTokenCreateOutputDto | void> {
    this.logger.log('Execute: create external api token by admin', this.createExternalToken.name);
    const result = await this.commandBus.execute<
      AdminCreateExternalApiTokenCommand,
      AppNotificationResult<ExternalApiTokenCreateOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminCreateExternalApiTokenCommand(body));

    this.logger.log(result.appResult, this.createExternalToken.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(`:tokenId/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
  @SwaggerDecoratorExternalTokenUpdate()
  async updateToken(
    @Param('tokenId', ParseIntPatchPipe) tokenId: number,
    @Body() body: ExternalApiTokenUpdateInputDto,
  ): Promise<ExternalApiTokenCreateOutputDto | void> {
    this.logger.log('Execute: update external api token by admin', this.updateToken.name);
    const result = await this.commandBus.execute<
      AdminUpdateExternalApiTokenCommand,
      AppNotificationResult<ExternalApiTokenCreateOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminUpdateExternalApiTokenCommand(tokenId, body));

    this.logger.log(result.appResult, this.updateToken.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:tokenId/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
  @SwaggerDecoratorExternalTokenRemove()
  async removeToken(@Param('tokenId', ParseIntPatchPipe) tokenId: number): Promise<void> {
    this.logger.log('Execute: remove external api token by admin', this.removeToken.name);
    const result = await this.commandBus.execute<
      AdminRemoveExternalApiTokenCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveExternalApiTokenCommand(tokenId));

    this.logger.log(result.appResult, this.removeToken.name);

    this.appNotification.handleHttpResult(result);
  }

  @Get(ADMIN_EXTERNAL_API_ROUTE.TRANSPORT)
  getDownloaderTransport(): {
    mode: DownloaderTransportModeEnum;
    isRmqAvailable: boolean;
    hasRmqErrors: boolean;
  } {
    this.logger.log(
      'Execute: get downloader transport mode by admin',
      this.getDownloaderTransport.name,
    );
    return this.downloaderTransportModeService.getState();
  }

  @Put(ADMIN_EXTERNAL_API_ROUTE.TRANSPORT)
  updateDownloaderTransport(@Body() body: SetDownloaderTransportInputDto): {
    mode: DownloaderTransportModeEnum;
    isRmqAvailable: boolean;
    hasRmqErrors: boolean;
  } {
    this.logger.log(
      `Execute: update downloader transport mode by admin. New mode: ${body.mode}`,
      this.updateDownloaderTransport.name,
    );

    try {
      this.downloaderTransportModeService.setMode(body.mode);
      return this.downloaderTransportModeService.getState();
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Invalid transport mode');
    }
  }

  @Get(ADMIN_EXTERNAL_API_ROUTE.CONNECTIONS)
  getConnectionsState(): ConnectionsOutputDto {
    this.logger.log(
      'Execute: get services connections state by admin',
      this.getConnectionsState.name,
    );

    const transport = this.downloaderTransportModeService.getState();
    const telegram = this.systemConnectionsStatusService.getTelegramState();

    const isDownloadConnected =
      transport.mode === DownloaderTransportModeEnum.HTTP
        ? true
        : transport.isRmqAvailable && !transport.hasRmqErrors;

    return {
      updatedAt: new Date().toISOString(),
      services: [
        {
          key: 'webAdminBack',
          title: 'web-admin -> back-nextweb',
          connected: true,
          details: 'Admin API is reachable',
        },
        {
          key: 'backDownload',
          title: 'back-nextweb -> download',
          connected: isDownloadConnected,
          details:
            transport.mode === DownloaderTransportModeEnum.RMQ && transport.hasRmqErrors
              ? 'RMQ errors detected, fallback to HTTP'
              : `Transport mode: ${transport.mode.toUpperCase()}`,
        },
        {
          key: 'backTelegramBot',
          title: 'back-nextweb -> telegram bot',
          connected: telegram.connected,
          details: telegram.lastError || 'Polling is active',
        },
      ],
    };
  }

  @Get(ADMIN_EXTERNAL_API_ROUTE.TRIGGERS)
  async getDownloaderTriggersSchedule(): Promise<DownloaderTriggerScheduleDto> {
    this.logger.log(
      'Execute: get downloader triggers schedule by admin',
      this.getDownloaderTriggersSchedule.name,
    );

    return this.downloaderServiceAdapter.getBridgeSchedule();
  }

  @Put(ADMIN_EXTERNAL_API_ROUTE.TRIGGERS)
  async updateDownloaderTriggersSchedule(
    @Body() body: UpdateDownloaderTriggersInputDto,
  ): Promise<DownloaderTriggerScheduleDto> {
    this.logger.log(
      'Execute: update downloader triggers schedule by admin',
      this.updateDownloaderTriggersSchedule.name,
    );

    return this.downloaderServiceAdapter.updateBridgeSchedule(body);
  }

  @Get(ADMIN_EXTERNAL_API_ROUTE.TRIGGERS_STATUS)
  async getDownloaderTriggersStatus(): Promise<DownloaderTriggerTaskRuntimeStatusDto> {
    this.logger.log(
      'Execute: get downloader triggers status by admin',
      this.getDownloaderTriggersStatus.name,
    );

    return this.downloaderServiceAdapter.getBridgeStatus();
  }

  @Post(ADMIN_EXTERNAL_API_ROUTE.TRIGGERS_RUN_BY_LIST)
  async runDownloaderByList(
    @Body() body: RunDownloaderByListInputDto,
  ): Promise<{ message: string }> {
    this.logger.log(
      'Execute: run downloader by title lists by admin',
      this.runDownloaderByList.name,
    );

    await this.downloaderServiceAdapter.bridgeRunByList(body);

    return { message: 'Run by list started' };
  }

  @Post(ADMIN_EXTERNAL_API_ROUTE.SIGN_MEDIA_URL)
  async signMediaUrl(@Body() body: SignMediaUrlInputDto): Promise<{ url: string }> {
    this.logger.log('Execute: sign media url by admin', this.signMediaUrl.name);

    const signed = await this.downloaderServiceAdapter.signMediaUrl(body.url, body.expiresInSec);
    if (!signed) {
      throw new BadRequestException([{ field: 'url', message: 'Failed to sign media url' }]);
    }

    return { url: signed };
  }

  @Post(ADMIN_EXTERNAL_API_ROUTE.TRIGGERS_CANCEL)
  async cancelDownloaderProcess(): Promise<{ message: string }> {
    this.logger.log(
      'Execute: cancel downloader process by admin',
      this.cancelDownloaderProcess.name,
    );

    const result = await this.downloaderServiceAdapter.cancelBridgeProcess();
    if (result.appResult !== AppNotificationResultEnum.Success) {
      throw new BadRequestException(
        result.errorField || [{ field: 'task', message: 'Cancel request failed' }],
      );
    }

    return { message: result.data?.message || 'Cancellation requested' };
  }
}
