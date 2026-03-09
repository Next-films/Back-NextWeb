import { applyDecorators } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation } from '@nestjs/swagger';

export const SwaggerDecoratorNewBackgroundContentForCartoon = () =>
  applyDecorators(
    ApiOperation({ summary: 'Send notification about new background content for cartoon' }),
    ApiNoContentResponse(),
  );
