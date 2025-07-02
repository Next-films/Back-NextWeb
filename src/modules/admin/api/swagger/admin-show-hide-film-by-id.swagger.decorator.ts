import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminShowOrHideFilmById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Show or hide film by admin by id' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiNotFoundResponse({
      description: 'Film not found',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or film already under moderation',
      type: RequestExceptionDto,
    }),
  );
}
