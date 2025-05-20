import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmsOutputDto, FilmsOutputDtoMapper } from '@/films/api/dtos/output/films.output.dto';

export class GetFilmByIdQuery implements IQuery {
  constructor(public filmId: number) {}
}

@QueryHandler(GetFilmByIdQuery)
export class GetFilmByIdQueryHandler
  implements
    IQueryHandler<
      GetFilmByIdQuery,
      AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly filmQueryRepository: FilmQueryRepository,
    private readonly filmsOutputDtoMapper: FilmsOutputDtoMapper,
  ) {
    this.logger.setContext(GetFilmByIdQueryHandler.name);
  }

  async execute(
    query: GetFilmByIdQuery,
  ): Promise<AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>> {
    const { filmId } = query;
    this.logger.log(`Get film by id command: ${filmId}`, this.execute.name);
    try {
      const film = await this.filmQueryRepository.getFilmById(filmId);
      if (!film)
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const result = this.filmsOutputDtoMapper.mapMovie(film);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
