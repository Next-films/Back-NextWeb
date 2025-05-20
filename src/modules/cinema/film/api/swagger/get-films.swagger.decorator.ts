import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { FilmsOutputDto } from '@/films/api/dtos/output/films.output.dto';

export function SwaggerDecoratorGetFilms(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get films' }),
    ApiOkResponsePaginated(FilmsOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
