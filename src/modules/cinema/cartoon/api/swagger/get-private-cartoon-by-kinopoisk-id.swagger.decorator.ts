import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { CartoonsPrivateOutputDto } from '@/cartoons/api/dtos/output/cartoons-private.output.dto';
import { ApiAppResponse } from '@/common/decorators/app-response.swagger.decorator';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorGetPrivateCartoonByKinopoiskId(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get private cartoon by kinopoisk id' }),
    ApiAppResponse(CartoonsPrivateOutputDto),
    ApiNotFoundResponse({ description: 'Cartoon not found', type: HttpPrivateExceptionDto }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
