import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ExternalApiTokenCreateOutputDto } from '@/admin/api/dtos/output/external-api-token-create.output.dto';

export function SwaggerDecoratorExternalTokenUpdate(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Update external token',
      description:
        'After the token is updated, a new token is created, and the old token is no longer valid.',
    }),
    ApiCreatedResponse({
      description: 'Success',
      type: ExternalApiTokenCreateOutputDto,
    }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({ description: 'Token not found' }),
  );
}
