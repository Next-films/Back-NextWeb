import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function SwaggerDecoratorBridgeRpcDownloadSerials(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Starting the process to download serials in the download service' }),
    ApiOkResponse({ description: 'Success' }),
  );
}
