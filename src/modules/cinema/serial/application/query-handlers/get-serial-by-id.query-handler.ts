import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialPublicQueryRepository } from '@/serials/infrastructure/serial-public.query-repository';
import {
  SerialsOutputDto,
  SerialsOutputDtoMapper,
} from '@/serials/api/dtos/output/serials.output.dto';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

export class GetSerialByIdQuery implements IQuery {
  constructor(public serialId: number) {}
}

type EpisodeLike = {
  videoUrl?: string | null;
  previewUrl?: string | null;
  voiceovers?: Array<{ videoUrl?: string | null }>;
};

type SignedSerialOutput = SerialsOutputDto & {
  trailerUrl?: string | null;
  backgroundImg?: string | null;
  cardImg?: string | null;
  titleImg?: string | null;
  episodes?: EpisodeLike[];
  films?: EpisodeLike[];
  seasons?: Array<{
    episodes?: EpisodeLike[];
    films?: EpisodeLike[];
  }>;
};

@QueryHandler(GetSerialByIdQuery)
export class GetSerialByIdQueryHandler
  implements
    IQueryHandler<
      GetSerialByIdQuery,
      AppNotificationResult<SerialsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialQueryRepository: SerialPublicQueryRepository,
    private readonly serialsOutputDtoMapper: SerialsOutputDtoMapper,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(GetSerialByIdQueryHandler.name);
  }

  private async signUrlWithCache(
    url: string | null | undefined,
    cache: Map<string, Promise<string | null>>,
  ): Promise<string | null> {
    if (!url) return url || null;

    if (!cache.has(url)) {
      cache.set(
        url,
        this.downloaderServiceAdapter.signMediaUrl(url, 3600).catch(error => {
          this.logger.error(error, this.signUrlWithCache.name);
          return url;
        }),
      );
    }

    return cache.get(url)!;
  }

  private async signSerialMedia(serial: SerialsOutputDto): Promise<SerialsOutputDto> {
    const result: SignedSerialOutput = { ...serial };
    const cache = new Map<string, Promise<string | null>>();
    const episodes = Array.isArray(result?.episodes) ? result.episodes : [];
    const films = Array.isArray(result?.films) ? result.films : [];
    const seasons = Array.isArray(result?.seasons) ? result.seasons : [];

    result.trailerUrl = await this.signUrlWithCache(result.trailerUrl, cache);
    result.backgroundImg = await this.signUrlWithCache(result.backgroundImg, cache);
    result.cardImg = await this.signUrlWithCache(result.cardImg, cache);
    result.titleImg = await this.signUrlWithCache(result.titleImg, cache);

    for (const episode of episodes) {
      episode.previewUrl = await this.signUrlWithCache(episode.previewUrl, cache);
    }

    for (const film of films) {
      film.videoUrl = await this.signUrlWithCache(film.videoUrl, cache);
      film.previewUrl = await this.signUrlWithCache(film.previewUrl, cache);

      if (Array.isArray(film?.voiceovers)) {
        for (const voiceover of film.voiceovers) {
          voiceover.videoUrl = await this.signUrlWithCache(voiceover.videoUrl, cache);
        }
      }
    }

    for (const season of seasons) {
      const seasonEpisodes = Array.isArray(season?.episodes) ? season.episodes : [];
      const seasonFilms = Array.isArray(season?.films) ? season.films : [];

      for (const episode of seasonEpisodes) {
        episode.previewUrl = await this.signUrlWithCache(episode.previewUrl, cache);
      }

      for (const film of seasonFilms) {
        film.videoUrl = await this.signUrlWithCache(film.videoUrl, cache);
        film.previewUrl = await this.signUrlWithCache(film.previewUrl, cache);

        if (Array.isArray(film?.voiceovers)) {
          for (const voiceover of film.voiceovers) {
            voiceover.videoUrl = await this.signUrlWithCache(voiceover.videoUrl, cache);
          }
        }
      }
    }

    return result;
  }

  async execute(
    query: GetSerialByIdQuery,
  ): Promise<AppNotificationResult<SerialsOutputDto, ErrorFieldExceptionDto | null>> {
    const { serialId } = query;
    this.logger.log(`Get serial by id command: ${serialId}`, this.execute.name);
    try {
      const serial = await this.serialQueryRepository.getSerialById(serialId);
      if (!serial)
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      const result = this.serialsOutputDtoMapper.mapSpecifySerial(serial);
      const signedResult = await this.signSerialMedia(result);

      return this.appNotification.success(signedResult);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
