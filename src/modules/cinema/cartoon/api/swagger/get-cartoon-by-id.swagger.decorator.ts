import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { CartoonsOutputDto } from '@/cartoons/api/dtos/output/cartoons.output.dto';

export function SwaggerDecoratorGetCartoonById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get cartoon by id' }),
    ApiOkResponse({ description: 'Success', type: CartoonsOutputDto }),
    ApiNotFoundResponse({ description: 'Cartoon not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
