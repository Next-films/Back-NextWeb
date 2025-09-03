import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorNewCartoonIsHandle(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Send notification about that cartoon is stated to handle',
      description:
        'Sends a download status update for a cartoon, indicating it is waiting in the queue or is being downloaded.',
    }),
    ApiCreatedResponse({ type: HttpPrivateExceptionDto, description: 'Success' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
