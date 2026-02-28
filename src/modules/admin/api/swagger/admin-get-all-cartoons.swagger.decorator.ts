import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { AdminCinemaCartoonsOutputDto } from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';

export function SwaggerDecoratorAdminGetAllCartoons(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all cartoons by admin' }),
    ApiOkResponsePaginated(AdminCinemaCartoonsOutputDto),
    ApiBadRequestResponse({
      description: 'Bad input data, or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
