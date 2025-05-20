import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { FilmsOutputDto } from '@/films/api/dtos/output/films.output.dto';

export function SwaggerDecoratorGetFilmById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get film by id' }),
    ApiOkResponse({ description: 'Success', type: FilmsOutputDto }),
    ApiNotFoundResponse({ description: 'Film not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
