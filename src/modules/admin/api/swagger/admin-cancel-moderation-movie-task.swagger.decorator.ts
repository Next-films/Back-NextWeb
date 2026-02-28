import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminCancelModerationMovieTask(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Cancel moderation movie task' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiNotFoundResponse({ description: 'Task not found' }),
    ApiForbiddenResponse({ description: 'Task not belong current admin' }),
    ApiBadRequestResponse({
      description: 'Bad input data or the task have not accepted',
      type: RequestExceptionDto,
    }),
  );
}
