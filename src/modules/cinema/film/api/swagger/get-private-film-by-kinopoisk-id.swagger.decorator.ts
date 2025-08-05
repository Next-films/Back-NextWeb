import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { FilmPrivateOutputDto } from '@/films/api/dtos/output/films-private.output.dto';
import { ApiAppResponse } from '@/common/decorators/app-response.swagger.decorator';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorGetPrivateFilmByKinopoiskId(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get private film by kinopoisk id' }),
    ApiAppResponse(FilmPrivateOutputDto),
    ApiNotFoundResponse({ type: HttpPrivateExceptionDto, description: 'Film not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
