import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function SwaggerDecoratorBridgeRpcFindFilms(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Starting the process to search for films in the download service' }),
    ApiOkResponse({ description: 'Success' }),
  );
}
