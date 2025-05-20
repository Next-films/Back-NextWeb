import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { GenreOutputDto } from '@/movies/api/dtos/output/genre.output.dto';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorGenreCreate(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Create new genre' }),
    ApiCreatedResponse({
      description: 'Success',
      type: GenreOutputDto,
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or genre already exists',
      type: RequestExceptionDto,
    }),
  );
}
