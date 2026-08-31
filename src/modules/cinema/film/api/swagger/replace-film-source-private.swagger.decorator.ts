import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiAppResponse } from '@/common/decorators/app-response.swagger.decorator';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';
import { ReplaceMovieSourceOutputDto } from '@/movies/api/dtos/output/replace-movie-source.output.dto';

export function SwaggerDecoratorReplaceFilmSource(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Replace the video source of an already published film',
      description:
        'Swaps only the video file and its duration for a film that is already in production. ' +
        'Metadata, posters, genres and moderation state stay untouched. ' +
        'The response returns previousVideoUrl — the playlist that was live before the call — ' +
        'so the caller can delete the superseded files from object storage. ' +
        'previousVideoUrl is null when the film already points at the requested key: the call ' +
        'was a replay, nothing changed, and the caller must delete nothing.',
    }),
    ApiAppResponse(ReplaceMovieSourceOutputDto),
    ApiNotFoundResponse({
      description: 'Film not found (errorKey: error.film_not_found)',
      type: HttpPrivateExceptionDto,
    }),
    ApiBadRequestResponse({
      description:
        'Bad input data, or the film cannot be replaced: ' +
        'errorKey error.film_on_moderation — the film is on moderation; ' +
        'errorKey error.film_source_not_replaceable — the film has no published source yet ' +
        '(use new-film instead) or the key is empty.',
      type: HttpPrivateExceptionDto,
    }),
  );
}
