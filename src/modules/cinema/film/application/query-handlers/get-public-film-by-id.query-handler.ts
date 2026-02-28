import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  FilmPublicOutputDto,
  FilmsPublicOutputDtoMapper,
} from '@/films/api/dtos/output/films-public.output.dto';
import { FilmPublicQueryRepository } from '@/films/infrastructure/film-public.query-repository';

export class GetPublicFilmByIdQuery implements IQuery {
  constructor(public filmId: number) {}
}

@QueryHandler(GetPublicFilmByIdQuery)
export class GetPublicFilmByIdQueryHandler
  implements
    IQueryHandler<
      GetPublicFilmByIdQuery,
      AppNotificationResult<FilmPublicOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly filmPublicQueryRepository: FilmPublicQueryRepository,
    private readonly filmsPublicOutputDtoMapper: FilmsPublicOutputDtoMapper,
  ) {
    this.logger.setContext(GetPublicFilmByIdQueryHandler.name);
  }

  async execute(
    query: GetPublicFilmByIdQuery,
  ): Promise<AppNotificationResult<FilmPublicOutputDto, ErrorFieldExceptionDto | null>> {
    const { filmId } = query;
    this.logger.log(`Get film by id command: ${filmId}`, this.execute.name);
    try {
      const film = await this.filmPublicQueryRepository.getFilmById(filmId);
      if (!film)
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const result = this.filmsPublicOutputDtoMapper.mapMovie(film);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
