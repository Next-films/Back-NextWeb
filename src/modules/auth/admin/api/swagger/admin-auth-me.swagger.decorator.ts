import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminMeOutputModel } from '@/admin-auth/api/dtos/output/admin-me.output.model';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

export function SwaggerDecoratorAdminMe(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Info about current admin' }),
    ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME),
    ApiOkResponse({
      description: 'Success',
      type: AdminMeOutputModel,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
