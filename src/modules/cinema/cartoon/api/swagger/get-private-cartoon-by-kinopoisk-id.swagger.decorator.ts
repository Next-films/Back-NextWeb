import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { CartoonsPrivateOutputDto } from '@/cartoons/api/dtos/output/cartoons-private.output.dto';

export function SwaggerDecoratorGetPrivateCartoonByKinopoiskId(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get private cartoon by kinopoisk id' }),
    ApiOkResponse({ description: 'Success', type: CartoonsPrivateOutputDto }),
    ApiNotFoundResponse({ description: 'Cartoon not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
