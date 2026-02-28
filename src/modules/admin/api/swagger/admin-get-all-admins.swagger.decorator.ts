import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiOperation } from '@nestjs/swagger';
import { ApiOkResponsePaginated } from '@/common/decorators/api-ok-paginated-response.swagger.decorator';
import { AdminGetAllAdminOutputDto } from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export function SwaggerDecoratorAdminGetAllAdmins(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get all admins' }),
    ApiOkResponsePaginated(AdminGetAllAdminOutputDto),
    ApiForbiddenResponse({ description: 'No access', type: RequestExceptionDto }),
    ApiBadRequestResponse({
      description: 'Bad request or incorrect page',
      type: RequestExceptionDto,
    }),
  );
}
