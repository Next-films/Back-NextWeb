import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminAcceptModerationMovieTask(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Accept moderation movie task by admin' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiNotFoundResponse({
      description: 'Task not found',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or task already accepted',
      type: RequestExceptionDto,
    }),
  );
}
