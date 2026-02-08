import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminRemoveSerialById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Remove serial by id' }),
    ApiNoContentResponse({ description: 'Success' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
