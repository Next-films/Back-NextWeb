import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { AdminBannedProvidersMoviesOutputDto } from '@/admin/api/dtos/output/admin-banned-providers-movies.output.dto';

export function SwaggerDecoratorAdminGetAllBannedProvidersMovies(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all banned providers movies' }),
    ApiOkResponsePaginated(AdminBannedProvidersMoviesOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
