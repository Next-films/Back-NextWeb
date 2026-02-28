import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { SpecifySerialsOutputDto } from '@/serials/api/dtos/output/serials.output.dto';

export function SwaggerDecoratorGetSerialById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get serial by id' }),
    ApiOkResponse({ description: 'Success', type: SpecifySerialsOutputDto }),
    ApiNotFoundResponse({ description: 'Serial not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
