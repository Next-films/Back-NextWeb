import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';

export function SwaggerDecoratorAdminPrivateCinemaModerationRequest(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Send request about moderation for movie',
      description:
        'Processes a moderation notification requesting manual verification of torrent providers, as the download service failed to automatically identify any suitable provider for the movie.',
    }),
    ApiCreatedResponse({ description: 'Success', type: HttpPrivateExceptionDto }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: HttpPrivateExceptionDto,
    }),
  );
}
