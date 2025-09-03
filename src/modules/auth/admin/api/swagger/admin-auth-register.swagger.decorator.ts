import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminLoginOutputModel } from '@/admin-auth/api/dtos/output/admin-login.output.model';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

export function SwaggerDecoratorAdminRegister(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Registration new admin' }),
    ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminLoginOutputModel,
    }),
    ApiBadRequestResponse({
      description: 'Incorrect input data or email or username already exists',
      type: ErrorFieldExceptionDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
