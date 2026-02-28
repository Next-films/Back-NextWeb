import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function SwaggerDecoratorBridgeRpcFindSerials(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Starting the process to search for serials in the download service' }),
    ApiOkResponse({ description: 'Success' }),
  );
}
