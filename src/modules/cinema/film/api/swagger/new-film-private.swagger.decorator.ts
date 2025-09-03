import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorNewFilm(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Send notification about new downloaded film',
      description:
        "Accepts a notification that a film's download is complete and it is ready for metadata processing.",
    }),
    ApiCreatedResponse({ type: HttpPrivateExceptionDto, description: 'Success' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
