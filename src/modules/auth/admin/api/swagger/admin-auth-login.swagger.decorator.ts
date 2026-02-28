import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminLoginOutputModel } from '@/admin-auth/api/dtos/output/admin-login.output.model';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminLogin(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Admin login' }),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminLoginOutputModel,
    }),
    ApiBadRequestResponse({
      description: 'Incorrect input data',
      type: ErrorFieldExceptionDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
