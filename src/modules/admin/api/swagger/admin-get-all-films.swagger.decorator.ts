import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminCinemaFilmsOutputDto } from '@/admin/api/dtos/output/admin-cinema-films.output.dto';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';

export function SwaggerDecoratorAdminGetAllFilms(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all films by admin' }),
    ApiOkResponsePaginated(AdminCinemaFilmsOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data, or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
