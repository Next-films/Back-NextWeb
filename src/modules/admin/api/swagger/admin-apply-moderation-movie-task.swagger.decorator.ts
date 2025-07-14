import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminApplyModerationMovieTask(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Apply moderation movie task with correct data' }),
    ApiNoContentResponse({
      description: 'Success',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or task not accepted or provider does not pass',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({
      description: 'Task not found or torrent validation error',
    }),
    ApiForbiddenResponse({
      description: 'The task does not belong to current user',
    }),
  );
}
