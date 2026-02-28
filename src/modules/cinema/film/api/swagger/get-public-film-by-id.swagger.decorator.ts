import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { FilmPublicOutputDto } from '@/films/api/dtos/output/films-public.output.dto';

export function SwaggerDecoratorGetPublicFilmById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get public film by id' }),
    ApiOkResponse({ description: 'Success', type: FilmPublicOutputDto }),
    ApiNotFoundResponse({ description: 'Film not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
