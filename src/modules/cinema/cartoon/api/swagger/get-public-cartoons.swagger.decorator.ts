import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { CartoonsPublicOutputDto } from '@/cartoons/api/dtos/output/cartoons-public.output.dto';

export function SwaggerDecoratorGetPublicCartoons(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get public cartoons' }),
    ApiOkResponsePaginated(CartoonsPublicOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
