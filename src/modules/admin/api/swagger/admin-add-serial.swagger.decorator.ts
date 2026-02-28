import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminCinemaSerialsOutputDto } from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';

export function SwaggerDecoratorAdminCreateSerial(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Add serial (deprecated)' }),
    ApiCreatedResponse({
      description: 'Created',
      type: AdminCinemaSerialsOutputDto,
    }),
    ApiBody({ description: 'Request body' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
