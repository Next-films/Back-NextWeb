import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';
import { ApiAppResponse } from '@/common/decorators/app-response.swagger.decorator';
import { BannedMoviesByProviderRpcOutputDto } from '@/banned-providers-movie/api/dtos/output/banned-movies-by-provider-rpc.output.dto';

export function SwaggerDecoratorGetBanProvider(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get banned provider' }),
    ApiAppResponse(BannedMoviesByProviderRpcOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
    ApiNotFoundResponse({
      description: 'Not found',
      type: HttpPrivateExceptionDto,
    }),
  );
}
