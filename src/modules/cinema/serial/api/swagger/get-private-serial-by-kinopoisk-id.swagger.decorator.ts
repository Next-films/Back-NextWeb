import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiAppResponse } from '@/common/decorators/app-response.swagger.decorator';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';
import { SerialPrivateOutputDto } from '@/serials/api/dtos/output/serials-private.output.dto';

export function SwaggerDecoratorGetPrivateSerialByKinopoiskId(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get private serial by kinopoisk id' }),
    ApiAppResponse(SerialPrivateOutputDto),
    ApiNotFoundResponse({ type: HttpPrivateExceptionDto, description: 'Serial not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
