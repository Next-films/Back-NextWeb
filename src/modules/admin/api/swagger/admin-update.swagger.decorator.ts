import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminGetAllAdminOutputDto } from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';

export function SwaggerDecoratorAdminUpdate(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Update admin' }),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminGetAllAdminOutputDto,
    }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({
      description: 'User not found',
      type: RequestExceptionDto,
    }),
    ApiForbiddenResponse({
      description: 'No access',
      type: RequestExceptionDto,
    }),
  );
}
