import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminChangeAdminRole(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Change administrator role by admin' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or task already accepted',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({
      description: 'User not found or roles not found',
      type: RequestExceptionDto,
    }),
    ApiForbiddenResponse({
      description: 'No access',
      type: RequestExceptionDto,
    }),
  );
}
