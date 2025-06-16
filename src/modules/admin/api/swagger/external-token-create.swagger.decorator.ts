import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ExternalApiTokenCreateOutputDto } from '@/admin/api/dtos/output/external-api-token-create.output.dto';

export function SwaggerDecoratorExternalTokenCreate(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Create new external token' }),
    ApiCreatedResponse({
      description: 'Success',
      type: ExternalApiTokenCreateOutputDto,
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or token name already exists',
      type: RequestExceptionDto,
    }),
  );
}
