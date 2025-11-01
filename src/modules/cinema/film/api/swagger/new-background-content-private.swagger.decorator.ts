import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorNewBackgroundContentForFilm(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Send notification about new background content for film',
    }),
    ApiNoContentResponse({ description: 'Success' }),
    ApiNotFoundResponse({
      description: 'Not found',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
