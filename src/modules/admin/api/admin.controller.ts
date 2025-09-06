import { Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ADMIN_ROUTE } from '@/common/constants/route.constants';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
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

// TODO: Guard
@UseGuards(AdminAccessTokenGuard)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: RequestExceptionDto })
@Controller(ADMIN_ROUTE.MAIN)
export class AdminController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    //private readonly commandBus: CommandBus,
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

  // @Get(':id')
  // async getAdminById(@Param('id', ParseIntPatchPipe) id: number) {
  // }

  @Put()
  async updateAdmin() {}

  // @Delete(':id')
  // async deleteAdmin(@Param('id', ParseIntPatchPipe) id: number) {}
}
