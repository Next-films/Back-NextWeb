import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function SwaggerDecoratorAdminLogout(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Admin logout' }),
    ApiCookieAuth(),
    ApiCreatedResponse({ description: 'Success' }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
