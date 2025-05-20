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

export function SwaggerDecoratorAdminRegister(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Registration new admin' }),
    ApiBearerAuth(),
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
