import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorExternalTokenRemove(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove external token by id',
    }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({ description: 'Token not found' }),
  );
}
