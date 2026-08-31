import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiAppResponse } from '@/common/decorators/app-response.swagger.decorator';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';
import { ReplaceMovieSourceOutputDto } from '@/movies/api/dtos/output/replace-movie-source.output.dto';

export function SwaggerDecoratorReplaceCartoonSource(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Replace the video source of an already published cartoon',
      description:
        'Swaps only the video file and its duration for a cartoon that is already in production. ' +
        'Metadata, posters, genres and moderation state stay untouched. ' +
        'The response returns previousVideoUrl — the playlist that was live before the call — ' +
        'so the caller can delete the superseded files from object storage. ' +
        'previousVideoUrl is null when the cartoon already points at the requested key: the call ' +
        'was a replay, nothing changed, and the caller must delete nothing.',
    }),
    ApiAppResponse(ReplaceMovieSourceOutputDto),
    ApiNotFoundResponse({
      description: 'Cartoon not found (errorKey: error.cartoon_not_found)',
      type: HttpPrivateExceptionDto,
    }),
    ApiBadRequestResponse({
      description:
        'Bad input data, or the cartoon cannot be replaced: ' +
        'errorKey error.cartoon_on_moderation — the cartoon is on moderation; ' +
        'errorKey error.cartoon_source_not_replaceable — the cartoon has no published source yet ' +
        '(use new-cartoon instead) or the key is empty.',
      type: HttpPrivateExceptionDto,
    }),
  );
}
