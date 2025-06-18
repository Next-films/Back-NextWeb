import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function SwaggerDecoratorBridgeRpcDownloadFilms(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Starting the process to download films in the download service' }),
    ApiOkResponse({ description: 'Success' }),
  );
}
