import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { SerialsOutputDto } from '@/serials/api/dtos/output/serials.output.dto';

export function SwaggerDecoratorGetSerials(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get serials' }),
    ApiOkResponsePaginated(SerialsOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
