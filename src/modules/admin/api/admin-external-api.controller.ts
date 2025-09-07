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
}
