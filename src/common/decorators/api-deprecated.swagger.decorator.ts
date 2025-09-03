import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDeprecated(message?: string) {
  return applyDecorators(
    ApiOperation({
      summary: message || 'Deprecated',
      deprecated: true,
    }),
  );
}
