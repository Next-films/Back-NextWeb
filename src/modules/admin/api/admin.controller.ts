import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_ROUTE } from '@/common/constants/route.constants';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminGetAllAdminRolesQuery } from '@/admin/application/query-handlers/admin-get-all-admin-roles.query-handler';
import { AdminRolesOutputDto } from '@/admin/api/dtos/output/admin-roles.output.dto';
import {
  ErrorFieldExceptionDto,
  RequestExceptionDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { SwaggerDecoratorAdminGetAllAdminRoles } from '@/admin/api/swagger/admin-get-all-admin-roles.swagger.decorator';
import { AdminGetAllAdminsQuery } from '@/admin/application/query-handlers/admin-get-all-admins.query-handler';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { AdminGetAllAdminOutputDto } from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';
import { GetAllAdminInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-admins.input-query.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { SwaggerDecoratorAdminGetAllAdmins } from '@/admin/api/swagger/admin-get-all-admins.swagger.decorator';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { AdminDeactivateAdminCommand } from '@/admin/application/handlers/admin-deactivate-admin.handler';
import { AdminActivateAdminCommand } from '@/admin/application/handlers/admin-activate-admin.handler';
import { AdminChangeAdminRoleCommand } from '@/admin/application/handlers/admin-change-admin-role.handler';
import { AdminChangeAdminRolesInputDto } from '@/admin/api/dtos/input/admin-change-admin-roles.input.dto';
import { SwaggerDecoratorAdminActivateAdmin } from '@/admin/api/swagger/admin-activate-admin.swagger.decorator';
import { SwaggerDecoratorAdminDeactivateAdmin } from '@/admin/api/swagger/admin-deactivate-admin.swagger.decorator';
import { SwaggerDecoratorAdminChangeAdminRole } from '@/admin/api/swagger/admin-chnage-admin-role.swagger.decorator';

@UseGuards(AdminAccessTokenGuard)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: RequestExceptionDto })
@Controller(ADMIN_ROUTE.MAIN)
export class AdminController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AdminController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllAdmins()
  async getAdmins(
    @Query() query: GetAllAdminInputQueryDto,
    @CurrentUser() user: AdminAccessTokenPayload,
  ) {
    this.logger.log('Get all admins', this.getAdmins.name);

    const result = await this.queryBus.execute<
      AdminGetAllAdminsQuery,
      AppNotificationResult<
        PaginationUtil<AdminGetAllAdminOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllAdminsQuery(query, user.id));

    this.logger.log(result.appResult, this.getAdmins.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(ADMIN_ROUTE.ROLES)
  @SwaggerDecoratorAdminGetAllAdminRoles()
  async getAdminRoles(): Promise<AdminRolesOutputDto[] | void> {
    this.logger.log('Get all admin roles', this.getAdminRoles.name);

    const result = await this.queryBus.execute<
      AdminGetAllAdminRolesQuery,
      AppNotificationResult<AdminRolesOutputDto[], ErrorFieldExceptionDto | null>
    >(new AdminGetAllAdminRolesQuery());

    this.logger.log(result.appResult, this.getAdminRoles.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`${ADMIN_ROUTE.ROLES}/:id`)
  @SwaggerDecoratorAdminChangeAdminRole()
  async changeAdminRole(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
    @Body() body: AdminChangeAdminRolesInputDto,
  ) {
    this.logger.log('Change admin role', this.changeAdminRole.name);

    const result = await this.commandBus.execute<
      AdminChangeAdminRoleCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminChangeAdminRoleCommand(body, id, user.id));

    this.logger.log(result.appResult, this.changeAdminRole.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @SwaggerDecoratorAdminDeactivateAdmin()
  async deactivateAdmin(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
  ) {
    this.logger.log('Deactivate admin', this.deactivateAdmin.name);

    const result = await this.commandBus.execute<
      AdminDeactivateAdminCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminDeactivateAdminCommand(id, user.id));

    this.logger.log(result.appResult, this.deactivateAdmin.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  @SwaggerDecoratorAdminActivateAdmin()
  async activateAdmin(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
  ) {
    this.logger.log('Activate admin', this.activateAdmin.name);

    const result = await this.commandBus.execute<
      AdminActivateAdminCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminActivateAdminCommand(id, user.id));

    this.logger.log(result.appResult, this.activateAdmin.name);

    this.appNotification.handleHttpResult(result);
  }
}
