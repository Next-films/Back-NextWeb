import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { GenreOutputDto } from '@/movies/api/dtos/output/genre.output.dto';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorGetAllGenre(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all genres' }),
    ApiOkResponsePaginated(GenreOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
