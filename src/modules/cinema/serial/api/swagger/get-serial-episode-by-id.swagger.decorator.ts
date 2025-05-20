import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { SerialEpisodeOutputDto } from '@/serials/api/dtos/output/serial-episode.output.dto';

export function SwaggerDecoratorGetSerialEpisodes(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get serial episode by id' }),
    ApiOkResponse({ description: 'Success', type: SerialEpisodeOutputDto }),
    ApiNotFoundResponse({ description: 'Serial or episode not found' }),
    ApiBadRequestResponse({
      description: 'Bad input data',
      type: RequestExceptionDto,
    }),
  );
}
