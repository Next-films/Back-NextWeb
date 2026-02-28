import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminCinemaSerialsOutputDto } from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';

export function SwaggerDecoratorAdminUpdateSerialById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Update serial by id' }),
    ApiCreatedResponse({
      description: 'Updated',
      type: AdminCinemaSerialsOutputDto,
    }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
    ApiNotFoundResponse({
      description: 'Serial not found',
      type: RequestExceptionDto,
    }),
  );
}
