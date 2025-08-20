import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminModerationMovieTaskByIdOutputDto } from '@/admin/api/dtos/output/admin-moderation-movie-task.output.dto';

export function SwaggerDecoratorAdminGetModerationMovieTaskById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get moderation movie task by id' }),
    ApiOkResponse({ description: 'Success', type: AdminModerationMovieTaskByIdOutputDto }),
    ApiNotFoundResponse({ description: 'Task not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
