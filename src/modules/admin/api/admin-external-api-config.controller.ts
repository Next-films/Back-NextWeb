import {
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
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import {
  AdminExternalApiConfigCreateInputDto,
  AdminExternalApiConfigUpdateInputDto,
} from '@/admin/api/dtos/input/admin-external-api-config.input.dto';
import { AdminGetAllExternalApiConfigInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-external-api-config.input-query.dto';
import { AdminCreateExternalApiConfigCommand } from '@/admin/application/handlers/admin-create-external-api-config.handler';
import { AdminUpdateExternalApiConfigCommand } from '@/admin/application/handlers/admin-update-external-api-config.handler';
import { AdminRemoveExternalApiConfigCommand } from '@/admin/application/handlers/admin-remove-external-api-config.handler';
import { AdminGetAllExternalApiConfigQuery } from '@/admin/application/query-handlers/admin-get-all-external-api-config.query-handler';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { AdminExternalApiConfigOutputDto } from '@/admin/api/dtos/output/admin-external-api-config.output.dto';

@ApiTags('Admin external api configs')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_EXTERNAL_API_ROUTE.MAIN}/${ADMIN_EXTERNAL_API_ROUTE.CONFIG}`)
export class AdminExternalApiConfigController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AdminExternalApiConfigController.name);
  }

  @Get()
  async getConfigs(
    @Query() query: AdminGetAllExternalApiConfigInputQueryDto,
  ): Promise<PaginationUtil<AdminExternalApiConfigOutputDto[]> | void> {
    this.logger.log('Execute: get external api configs by admin', this.getConfigs.name);
    const result = await this.queryBus.execute<
      AdminGetAllExternalApiConfigQuery,
      AppNotificationResult<
        PaginationUtil<AdminExternalApiConfigOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllExternalApiConfigQuery(query));

    this.logger.log(result.appResult, this.getConfigs.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Post()
  async createConfig(
    @Body() body: AdminExternalApiConfigCreateInputDto,
  ): Promise<AdminExternalApiConfigOutputDto | void> {
    this.logger.log('Execute: create external api config by admin', this.createConfig.name);
    const result = await this.commandBus.execute<
      AdminCreateExternalApiConfigCommand,
      AppNotificationResult<AdminExternalApiConfigOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminCreateExternalApiConfigCommand(body));

    this.logger.log(result.appResult, this.createConfig.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(':configId')
  async updateConfig(
    @Param('configId', ParseIntPatchPipe) configId: number,
    @Body() body: AdminExternalApiConfigUpdateInputDto,
  ): Promise<AdminExternalApiConfigOutputDto | void> {
    this.logger.log('Execute: update external api config by admin', this.updateConfig.name);
    const result = await this.commandBus.execute<
      AdminUpdateExternalApiConfigCommand,
      AppNotificationResult<AdminExternalApiConfigOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminUpdateExternalApiConfigCommand(configId, body));

    this.logger.log(result.appResult, this.updateConfig.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':configId')
  async removeConfig(@Param('configId', ParseIntPatchPipe) configId: number): Promise<void> {
    this.logger.log('Execute: remove external api config by admin', this.removeConfig.name);
    const result = await this.commandBus.execute<
      AdminRemoveExternalApiConfigCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveExternalApiConfigCommand(configId));

    this.logger.log(result.appResult, this.removeConfig.name);
    this.appNotification.handleHttpResult(result);
  }
}
