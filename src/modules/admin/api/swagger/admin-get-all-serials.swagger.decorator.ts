import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminCinemaSerialsOutputDto } from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';

export function SwaggerDecoratorAdminGetAllSerials(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all serials by admin' }),
    ApiOkResponsePaginated(AdminCinemaSerialsOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data, or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
