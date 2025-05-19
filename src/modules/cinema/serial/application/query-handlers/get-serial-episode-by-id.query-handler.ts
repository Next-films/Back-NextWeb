import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import {
  SerialEpisodeOutputDto,
  SerialEpisodesOutputDtoMapper,
} from '@/serials/api/dtos/output/serial-episode.output.dto';

export class GetSerialEpisodeByIdQuery implements IQuery {
  constructor(
    public serialId: number,
    public episodeId: number,
  ) {}
}

@QueryHandler(GetSerialEpisodeByIdQuery)
export class GetSerialEpisodeByIdQueryHandler
  implements
    IQueryHandler<
      GetSerialEpisodeByIdQuery,
      AppNotificationResult<SerialEpisodeOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialQueryRepository: SerialQueryRepository,
    private readonly serialEpisodesOutputDtoMapper: SerialEpisodesOutputDtoMapper,
  ) {
    this.logger.setContext(GetSerialEpisodeByIdQueryHandler.name);
  }

  async execute(
    query: GetSerialEpisodeByIdQuery,
  ): Promise<AppNotificationResult<SerialEpisodeOutputDto, ErrorFieldExceptionDto | null>> {
    const { serialId, episodeId } = query;
    this.logger.log(
      `Get serial episode by id command: ${serialId}, ${episodeId}`,
      this.execute.name,
    );
    try {
      const episode = await this.serialQueryRepository.getSerialEpisodeById(serialId, episodeId);
      if (!episode)
        return this.appNotification.notFound({
          field: 'episodeId',
          message: 'Episode not found',
          errorKey: EXCEPTION_KEYS_ENUM.EPISODE_NOT_FOUND,
        });

      const result = this.serialEpisodesOutputDtoMapper.mapEpisode(episode);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
