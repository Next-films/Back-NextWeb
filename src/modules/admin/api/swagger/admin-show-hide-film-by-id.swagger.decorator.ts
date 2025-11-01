import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminCinemaFilmsOutputDto } from '@/admin/api/dtos/output/admin-cinema-films.output.dto';

export function SwaggerDecoratorAdminShowOrHideFilmById(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Show or hide film by admin by id' }),
    ApiCreatedResponse({
      description: 'Success',
      type: AdminCinemaFilmsOutputDto,
    }),
    ApiNotFoundResponse({
      description: 'Film not found',
    }),
    ApiBadRequestResponse({
      description: 'Bad input data or film already under moderation',
      type: RequestExceptionDto,
    }),
  );
}
