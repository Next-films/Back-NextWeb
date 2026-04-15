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
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { AdminUpdateCommand } from '@/admin/application/handlers/admin-update.handler';
import { AdminUpdateInputDto } from '@/admin/api/dtos/input/admin-update.input.dto';
import { AdminGetAdminByIdQuery } from '@/admin/application/query-handlers/admin-get-admin-by-id.query-handler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ADMIN_UPDATE_AVATAR_INPUT_MAX_SIZE,
  ADMIN_UPDATE_AVATAR_INPUT_MIME_TYPES,
  AdminUpdateAvatarInputDto,
} from '@/admin/api/dtos/input/admin-update-avatar.config';
import { fileValidationPipe } from '@/common/pipes/validation-file.pipe';
import { AdminUpdateAvatarCommand } from '@/admin/application/handlers/admin-update-avatar.handler';
import { SwaggerDecoratorAdminUpdate } from '@/admin/api/swagger/admin-update.swagger.decorator';
import { SwaggerDecoratorAdminUpdateAvatar } from '@/admin/api/swagger/admin-update-avatar.swagger.decorator';
import { AdminAccessTokenByRoleOnlyAdminGuard } from '@/admin-auth/application/guards/jwt/admin-access-token-by-role-only-admin.guard';
import { AdminRemoveAdminCommand } from '@/admin/application/handlers/admin-remove-admin.handler';

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
  @UseGuards(AdminAccessTokenByRoleOnlyAdminGuard)
  @SwaggerDecoratorAdminGetAllAdmins()
  async getAdmins(
    @Query() query: GetAllAdminInputQueryDto,
  ): Promise<PaginationUtil<AdminGetAllAdminOutputDto[]> | void> {
    this.logger.log('Get all admins', this.getAdmins.name);

    const result = await this.queryBus.execute<
      AdminGetAllAdminsQuery,
      AppNotificationResult<
        PaginationUtil<AdminGetAllAdminOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllAdminsQuery(query));

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

  @HttpCode(HttpStatus.CREATED)
  @Put(`:id(\\d+)`)
  @SwaggerDecoratorAdminUpdate()
  async updateAdmin(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
    @Body() body: AdminUpdateInputDto,
  ): Promise<AdminGetAllAdminOutputDto | void> {
    this.logger.log('Update admin', this.updateAdmin.name);

    const result = await this.commandBus.execute<
      AdminUpdateCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminUpdateCommand(body, id, user.id));

    this.logger.log(result.appResult, this.updateAdmin.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const result = await this.queryBus.execute<
        AdminGetAdminByIdQuery,
        AppNotificationResult<AdminGetAllAdminOutputDto>
      >(new AdminGetAdminByIdQuery(id, user.id));

      return result.data!;
    }

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(`${ADMIN_ROUTE.AVATAR}/:id`)
  @SwaggerDecoratorAdminUpdateAvatar()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAdminAvatar(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
    @Body() body: AdminUpdateAvatarInputDto,
    @UploadedFile(
      fileValidationPipe(
        ADMIN_UPDATE_AVATAR_INPUT_MIME_TYPES,
        ADMIN_UPDATE_AVATAR_INPUT_MAX_SIZE,
        'file',
      ),
    )
    file: Express.Multer.File,
  ): Promise<AdminGetAllAdminOutputDto | void> {
    this.logger.log('Upload admin avatar', this.uploadAdminAvatar.name);

    const result = await this.commandBus.execute<
      AdminUpdateAvatarCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminUpdateAvatarCommand(file, id, user.id));

    this.logger.log(result.appResult, this.uploadAdminAvatar.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const result = await this.queryBus.execute<
        AdminGetAdminByIdQuery,
        AppNotificationResult<AdminGetAllAdminOutputDto>
      >(new AdminGetAdminByIdQuery(id, user.id));

      return result.data!;
    }

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`${ADMIN_ROUTE.ROLES}/:id`)
  @SwaggerDecoratorAdminChangeAdminRole()
  async changeAdminRole(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
    @Body() body: AdminChangeAdminRolesInputDto,
  ): Promise<void> {
    this.logger.log('Change admin role', this.changeAdminRole.name);

    const result = await this.commandBus.execute<
      AdminChangeAdminRoleCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminChangeAdminRoleCommand(body, id, user.id));

    this.logger.log(result.appResult, this.changeAdminRole.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id(\\d+)')
  @SwaggerDecoratorAdminDeactivateAdmin()
  async deactivateAdmin(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
  ): Promise<void> {
    this.logger.log('Deactivate admin', this.deactivateAdmin.name);

    const result = await this.commandBus.execute<
      AdminDeactivateAdminCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminDeactivateAdminCommand(id, user.id));

    this.logger.log(result.appResult, this.deactivateAdmin.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`${ADMIN_ROUTE.REMOVE}/:id`)
  async removeAdmin(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
  ): Promise<void> {
    this.logger.log('Remove admin', this.removeAdmin.name);

    const result = await this.commandBus.execute<
      AdminRemoveAdminCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveAdminCommand(id, user.id));

    this.logger.log(result.appResult, this.removeAdmin.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id(\\d+)')
  @SwaggerDecoratorAdminActivateAdmin()
  async activateAdmin(
    @Param('id', ParseIntPatchPipe) id: number,
    @CurrentUser() user: AdminAccessTokenPayload,
  ): Promise<void> {
    this.logger.log('Activate admin', this.activateAdmin.name);

    const result = await this.commandBus.execute<
      AdminActivateAdminCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminActivateAdminCommand(id, user.id));

    this.logger.log(result.appResult, this.activateAdmin.name);

    this.appNotification.handleHttpResult(result);
  }
}
