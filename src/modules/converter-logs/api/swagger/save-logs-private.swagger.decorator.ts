import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorSaveConverterLogs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Save converter logs' }),
    ApiCreatedResponse({ description: 'Success', type: HttpPrivateExceptionDto }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
