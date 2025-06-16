import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ExternalApiTokenOutputDto } from '@/admin/api/dtos/output/external-api-tokens.output.dto';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';

export function SwaggerDecoratorExternalToken(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all external tokens' }),
    ApiOkResponsePaginated(ExternalApiTokenOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
