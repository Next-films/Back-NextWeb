import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminGetAllAdminOutputDto } from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';

export function SwaggerDecoratorAdminRegister(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Registration new admin' }),
    ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminGetAllAdminOutputDto,
    }),
    ApiBadRequestResponse({
      description: 'Incorrect input data or email or username already exists',
      type: RequestExceptionDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({
      description: 'Role not Found',
      type: RequestExceptionDto,
    }),
    ApiForbiddenResponse({
      description: 'No access',
      type: RequestExceptionDto,
    }),
  );
}
