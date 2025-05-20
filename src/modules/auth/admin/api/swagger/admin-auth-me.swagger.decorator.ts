import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminMeOutputModel } from '@/admin-auth/api/dtos/output/admin-me.output.model';

export function SwaggerDecoratorAdminMe(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Info about current admin' }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Success',
      type: AdminMeOutputModel,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
  );
}
