import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function SwaggerDecoratorBridgeRpcDownloadCartoons(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Starting the process to download cartoons in the download service' }),
    ApiOkResponse({ description: 'Success' }),
  );
}
