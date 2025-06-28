import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

// TODO: доп ответы
export function SwaggerDecoratorAdminCreateFilm(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Create film by admin' }),
    ApiCreatedResponse({ description: 'Success' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
