import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { DateUtil } from '@/common/utils/date.util';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { FilmCreateDto, NewFilmNotificationPayloadDto } from '@/films/domain/types';
import { Film } from '@/films/domain/film.entity';
import { MovieHandleStatus } from '@/movies/domain/types';
import { MoviesService } from '@/movies/application/movies.service';

export class NewFilmNotificationCommand implements ICommand {
  constructor(public inputDto: NewFilmNotificationPayloadDto) {}
}

@CommandHandler(NewFilmNotificationCommand)
export class NewFilmNotificationCommandHandler
  implements
    ICommandHandler<
      NewFilmNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Film.name) private readonly filmEntity: typeof Film,
    private readonly filmRepository: FilmRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly dateUtil: DateUtil,
    private readonly moviesService: MoviesService,
  ) {
    this.logger.setContext(NewFilmNotificationCommandHandler.name);
  }

  async execute(
    command: NewFilmNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpId, key, duration } = inputDto;
    this.logger.log(`New film notification command`, this.execute.name);
    try {
      const [kpMovie, film] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.filmRepository.getFilmByKinopoiskId(kpId),
      ]);

      // TODO: доработать трейлеры и фото
      // TODO: отправка нотификации админу что нужно проверить фильм, фильм. Подумать как обработать
      if (!kpMovie) {
        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.KP_MOVIE_NOT_FOUND,
          message: 'Movie not found',
          field: 'kpId',
        });
      }

      // TODO: отправка нотификации админу что нужно проверить фильм. Подумать как обработать (вернуть в очередь или создать фильм но с hidden)
      if (
        (film && film.handleStatus === MovieHandleStatus.PRODUCTION) ||
        (film && film.handleStatus === MovieHandleStatus.MODERATE)
      ) {
        this.logger.warn('Film already exist', this.execute.name);

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_ALREADY_EXIST,
          message: 'Film already exist',
          field: 'kpId',
        });
      }

      const {
        name: rawName,
        enName,
        alternativeName: rawAlternativeName,
        year,
        countries,
        premiere,
        description,
        genres: rawGenres,
      } = kpMovie;

      let worldReleaseDate: string | null = null;
      if (premiere) {
        const { world } = premiere;
        worldReleaseDate = world || null;
      }

      const name = rawName || rawAlternativeName || enName || null;
      const originalName = enName || rawAlternativeName || null;
      const alternativeName = [rawName, rawAlternativeName, enName, year].filter(Boolean).join(' ');

      const genres = rawGenres
        ? await this.moviesService.getOrCreateGenreFromKinopoisk(rawGenres)
        : null;

      const country = countries?.map(c => c.name) || null;

      const hidden =
        !name ||
        !worldReleaseDate ||
        !description ||
        !genres ||
        !duration ||
        duration === 0 ||
        !country ||
        country.length === 0;

      const filmDto: FilmCreateDto = {
        key,
        kpId,
        duration: duration || 0,
        name: name || 'unknown',
        originalName,
        hidden,
        genres,
        alternativeName,
        country,
        description: description || null,
        releaseDate: worldReleaseDate ? this.dateUtil.formatDateYyMmDd(worldReleaseDate) : null,
        handleStatus: MovieHandleStatus.PROCESSING,
      };

      let handledFilm: Film | null = null;

      if (film) {
        handledFilm = this.handleExistFilm(film, filmDto);
      } else {
        handledFilm = this.handleNewFilm(filmDto);
      }

      if (!handledFilm) {
        this.logger.error(
          'Something went wrong. There is no movie being processed.',
          this.execute.name,
        );

        return this.appNotification.internalServerError();
      }

      if (!hidden) {
        handledFilm.updateHandleStatus(MovieHandleStatus.PRODUCTION);
      } else {
        handledFilm.updateHandleStatus(MovieHandleStatus.MODERATE);
      }

      await this.filmRepository.save(handledFilm);

      if (hidden) {
        this.logger.log('Moderate film', this.execute.name);

        // TODO: moderate
      }
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private handleExistFilm(film: Film, filmDto: FilmCreateDto): Film {
    film.update(filmDto);
    return film;
  }

  private handleNewFilm(filmDto: FilmCreateDto): Film {
    return this.filmEntity.create(filmDto);
  }
}
