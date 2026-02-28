import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ExternalApiTokenCheckOutputDto } from '@/external-auth/api/dtos/output/external-api-token-check.output.dto';

export function SwaggerDecoratorExternalTokenCheck(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Check external token health' }),
    ApiOkResponse({ description: 'Success', type: ExternalApiTokenCheckOutputDto }),
  );
}
