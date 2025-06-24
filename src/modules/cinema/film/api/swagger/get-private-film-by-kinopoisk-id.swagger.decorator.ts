import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { FilmPrivateOutputDto } from '@/films/api/dtos/output/films-private.output.dto';

export function SwaggerDecoratorGetPrivateFilmByKinopoiskId(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get private film by kinopoisk id' }),
    ApiOkResponse({ description: 'Success', type: FilmPrivateOutputDto }),
    ApiNotFoundResponse({ description: 'Film not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
