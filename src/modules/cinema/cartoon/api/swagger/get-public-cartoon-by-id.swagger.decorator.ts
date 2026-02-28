import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { CartoonPublicOutputDto } from '@/cartoons/api/dtos/output/cartoons-public.output.dto';

export function SwaggerDecoratorGetPublicCartoonById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get public cartoon by id' }),
    ApiOkResponse({ description: 'Success', type: CartoonPublicOutputDto }),
    ApiNotFoundResponse({ description: 'Cartoon not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
