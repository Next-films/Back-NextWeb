import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { CartoonsOutputDto } from '@/cartoons/api/dtos/output/cartoons.output.dto';

export function SwaggerDecoratorGetCartoons(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get cartoons' }),
    ApiOkResponsePaginated(CartoonsOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
