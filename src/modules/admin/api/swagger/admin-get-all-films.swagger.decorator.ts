import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

// TODO:
export function SwaggerDecoratorAdminGetAllFilms(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all films by admin' }),
    //ApiOkResponsePaginated(AdminBannedProvidersMoviesOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
