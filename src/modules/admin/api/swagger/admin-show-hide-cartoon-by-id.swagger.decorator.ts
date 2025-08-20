import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminShowOrHideCartoonById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Show or hide cartoon by admin by id' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiNotFoundResponse({
      description: 'Cartoon not found',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or cartoon already under moderation',
      type: RequestExceptionDto,
    }),
  );
}
