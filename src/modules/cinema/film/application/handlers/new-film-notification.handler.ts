import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { FilmCreateDto, FilmUpdateDto } from '@/films/domain/types';
import { Film } from '@/films/domain/film.entity';
import { MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { MoviesService } from '@/movies/application/movies.service';
import { NewFilmNotificationPayloadDto } from '@/films/api/dtos/input/new-film-notification.input.dto';

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
      const [kpMovie, existingFilm] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.filmRepository.getFilmByKinopoiskId(kpId),
      ]);

      // TODO: доработать трейлеры и фото
      // TODO: отправка нотификации админу что нужно проверить фильм. Подумать как обработать (вернуть в очередь или создать фильм но с hidden)
      if (this.moviesService.isFilmInProductionOrModerate(existingFilm)) {
        this.logger.warn('Film already exist', this.execute.name);

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_ALREADY_EXIST,
          message: 'Film already exist',
          field: 'kpId',
        });
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie);

      const film = existingFilm
        ? this.updateExistingFilm(existingFilm, metadata, key, duration || 0, kpId)
        : this.createNewFilm(metadata, key, duration || 0, kpId);

      this.moviesService.setHandleProductionStatus(film);

      await this.filmRepository.save(film);

      if (film.handleStatus === MovieHandleStatus.MODERATE) {
        this.logger.log('Film sent to moderation', this.execute.name);
        // TODO: moderate
      }
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private updateExistingFilm(
    film: Film,
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Film {
    // TODO: Трейлеры и тд
    const filmDto: FilmUpdateDto = {
      videUrl: key,
      kpId,
      duration: duration || 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      titleUrl: null,
      previewUrl: null,
      trailerUrl: null,
      backgroundContentUrl: null,
    };
    film.update(filmDto);
    return film;
  }

  private createNewFilm(
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Film {
    // TODO: Трейлеры и тд
    const filmDto: FilmCreateDto = {
      key,
      kpId,
      duration: duration || 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      hidden: false,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      handleStatus: MovieHandleStatus.PROCESSING,
    };
    return this.filmEntity.create(filmDto);
  }
}
