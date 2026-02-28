import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminLoginOutputModel } from '@/admin-auth/api/dtos/output/admin-login.output.model';

export function SwaggerDecoratorAdminUpdateTokens(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Update admin tokens pairs' }),
    ApiCookieAuth(),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminLoginOutputModel,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
