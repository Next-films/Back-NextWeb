import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  CartoonPublicOutputDto,
  CartoonsPublicOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons-public.output.dto';
import { CartoonPublicQueryRepository } from '@/cartoons/infrastructure/cartoon-public.query-repository';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

export class GetPublicCartoonByIdQuery implements IQuery {
  constructor(public cartoonId: number) {}
}

@QueryHandler(GetPublicCartoonByIdQuery)
export class GetPublicCartoonByIdQueryHandler
  implements
    IQueryHandler<
      GetPublicCartoonByIdQuery,
      AppNotificationResult<CartoonPublicOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonPublicQueryRepository: CartoonPublicQueryRepository,
    private readonly cartoonsPublicOutputDtoMapper: CartoonsPublicOutputDtoMapper,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(GetPublicCartoonByIdQueryHandler.name);
  }

  private async signUrl(url: string | null): Promise<string | null> {
    if (!url) return url;

    try {
      return await this.downloaderServiceAdapter.signMediaUrl(url, 3600);
    } catch (error) {
      this.logger.error(error, this.signUrl.name);
      return url;
    }
  }

  private async signMovieMedia(movie: CartoonPublicOutputDto): Promise<CartoonPublicOutputDto> {
    if (!movie?.content) return movie;

    const [movieUrl, trailerUrl, previewUrl, horizontalPreviewUrl, backgroundUrl, titleUrl] =
      await Promise.all([
        this.signUrl(movie.content.movieUrl),
        this.signUrl(movie.content.trailerUrl),
        this.signUrl(movie.content.previewUrl),
        this.signUrl(movie.content.horizontalPreviewUrl),
        this.signUrl(movie.content.backgroundUrl),
        this.signUrl(movie.content.titleUrl),
      ]);

    return {
      ...movie,
      content: {
        ...movie.content,
        movieUrl,
        trailerUrl,
        previewUrl,
        horizontalPreviewUrl,
        backgroundUrl,
        titleUrl,
      },
    };
  }

  async execute(
    query: GetPublicCartoonByIdQuery,
  ): Promise<AppNotificationResult<CartoonPublicOutputDto, ErrorFieldExceptionDto | null>> {
    const { cartoonId } = query;
    this.logger.log(`Get cartoon by id command: ${cartoonId}`, this.execute.name);
    try {
      const cartoon = await this.cartoonPublicQueryRepository.getCartoonById(cartoonId);
      if (!cartoon)
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      const result = this.cartoonsPublicOutputDtoMapper.mapMovie(cartoon);
      const signedResult = await this.signMovieMedia(result);

      return this.appNotification.success(signedResult);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
