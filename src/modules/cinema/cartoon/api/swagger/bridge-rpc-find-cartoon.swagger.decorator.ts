import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function SwaggerDecoratorBridgeRpcFindCartoon(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Starting the process to search for cartoon in the download service' }),
    ApiOkResponse({ description: 'Success' }),
  );
}
