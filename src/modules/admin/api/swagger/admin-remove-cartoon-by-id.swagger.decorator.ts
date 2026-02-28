import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminRemoveCartoonById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Remove cartoon by admin by id' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiNotFoundResponse({ description: 'Cartoon not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
