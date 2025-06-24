import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { FilmsPublicOutputDto } from '@/films/api/dtos/output/films-public.output.dto';

export function SwaggerDecoratorGetPublicFilms(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get public films' }),
    ApiOkResponsePaginated(FilmsPublicOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
