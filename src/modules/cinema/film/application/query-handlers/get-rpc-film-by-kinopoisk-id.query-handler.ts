import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  FilmsRpcOutputDto,
  FilmsRpcOutputDtoMapper,
} from '@/films/api/dtos/output/films-rpc.output.dto';

export class GetRpcFilmByKinopoiskIdQuery implements IQuery {
  constructor(public kpId: string) {}
}

@QueryHandler(GetRpcFilmByKinopoiskIdQuery)
export class GetRpcFilmByKinopoiskIdQueryHandler
  implements
    IQueryHandler<
      GetRpcFilmByKinopoiskIdQuery,
      AppNotificationResult<FilmsRpcOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly filmQueryRepository: FilmQueryRepository,
    private readonly filmsRpcOutputDtoMapper: FilmsRpcOutputDtoMapper,
  ) {
    this.logger.setContext(GetRpcFilmByKinopoiskIdQueryHandler.name);
  }

  async execute(
    query: GetRpcFilmByKinopoiskIdQuery,
  ): Promise<AppNotificationResult<FilmsRpcOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = query;
    this.logger.log(`Get film by kinopoisk id command (rpc): ${kpId}`, this.execute.name);
    try {
      const film = await this.filmQueryRepository.getFilmByKinopoiskId(kpId);

      if (!film)
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const result = this.filmsRpcOutputDtoMapper.mapMovie(film);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
