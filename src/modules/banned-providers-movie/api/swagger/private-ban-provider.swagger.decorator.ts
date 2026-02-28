import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorBanProvider(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Ban provider',
      description:
        'Adds torrent providers and their content to a blacklist to prevent future processing of their resources by ID.',
    }),
    ApiCreatedResponse({ description: 'Success', type: HttpPrivateExceptionDto }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
