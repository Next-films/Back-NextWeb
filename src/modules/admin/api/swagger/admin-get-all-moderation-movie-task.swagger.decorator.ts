import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminModerationMovieTaskOutputDto } from '@/admin/api/dtos/output/admin-moderation-movie-task.output.dto';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';

export function SwaggerDecoratorAdminGetAllModerationMovieTask(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all moderation tasks' }),
    ApiOkResponsePaginated(AdminModerationMovieTaskOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
