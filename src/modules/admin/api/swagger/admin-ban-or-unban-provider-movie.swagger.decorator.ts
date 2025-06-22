import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminBanOrUnbanProviderMovie(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Ban or unban provider movie' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
