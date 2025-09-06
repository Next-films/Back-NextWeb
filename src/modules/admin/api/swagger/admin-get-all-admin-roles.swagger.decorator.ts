import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AdminRolesOutputDto } from '@/admin/api/dtos/output/admin-roles.output.dto';

export function SwaggerDecoratorAdminGetAllAdminRoles(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all admin roles' }),
    ApiOkResponse({
      description: 'Success',
      type: AdminRolesOutputDto,
      isArray: true,
    }),
  );
}
