import { Controller, Get, Put } from '@nestjs/common';
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

// TODO: Guard
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
  async getAdmins() {}

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
