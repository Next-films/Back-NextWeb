import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  AdminCinemaFilmsOutputDto,
  AdminCinemaFilmsOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-films.output.dto';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { AdminMediaUrlSigningService } from '@/admin/application/services/admin-media-url-signing.service';

export class AdminGetFilmByIdQuery implements IQuery {
  constructor(public filmId: number) {}
}

@QueryHandler(AdminGetFilmByIdQuery)
export class AdminGetFilmByIdQueryHandler
  implements
    IQueryHandler<
      AdminGetFilmByIdQuery,
      AppNotificationResult<AdminCinemaFilmsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly filmQueryRepository: FilmQueryRepository,
    private readonly adminCinemaFilmsOutputDtoMapper: AdminCinemaFilmsOutputDtoMapper,
    private readonly adminMediaUrlSigningService: AdminMediaUrlSigningService,
  ) {
    this.logger.setContext(AdminGetFilmByIdQueryHandler.name);
  }

  async execute(
    query: AdminGetFilmByIdQuery,
  ): Promise<AppNotificationResult<AdminCinemaFilmsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Get film by id by admin command`, this.execute.name);
    const { filmId } = query;
    try {
      const film = await this.filmQueryRepository.getFilmById(filmId);

      if (!film)
        return this.appNotification.notFound({
          field: 'id',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const mapped = this.adminCinemaFilmsOutputDtoMapper.mapMovie(film);
      const signed = await this.adminMediaUrlSigningService.signMovie(mapped);

      return this.appNotification.success(signed);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
