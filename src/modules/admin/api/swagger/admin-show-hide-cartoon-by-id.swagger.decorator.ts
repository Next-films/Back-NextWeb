import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminCinemaCartoonsOutputDto } from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';

export function SwaggerDecoratorAdminShowOrHideCartoonById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Show or hide cartoon by admin by id' }),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminCinemaCartoonsOutputDto,
    }),
    ApiNotFoundResponse({
      description: 'Cartoon not found',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or cartoon already under moderation',
      type: RequestExceptionDto,
    }),
  );
}
