import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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
import { MovieAvailabilityStatus, MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { MoviesService } from '@/movies/application/movies.service';
import { NewFilmNotificationPayloadDto } from '@/films/api/dtos/input/new-film-notification.input.dto';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { MovieTypesEnum } from '@/common/types/types';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-movie-downloaded-without-moderation.handler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

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
    private readonly moderationFilmRepository: ModerationFilmRepository,
    @Inject(ModerationFilmEntity.name)
    private readonly moderationFilmEntity: typeof ModerationFilmEntity,
    private readonly commandBus: CommandBus,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewFilmNotificationCommandHandler.name);
  }

  async execute(
    command: NewFilmNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpId, key, duration } = inputDto;
    this.logger.log(`New film notification command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [kpMovie, existingFilm] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.filmRepository.getFilmByKinopoiskId(kpId, queryRunner),
      ]);

      if (this.isAlreadyPlayableOrModerating(existingFilm)) {
        this.logger.warn('Film already exist', this.execute.name);

        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_ALREADY_EXIST,
          message: 'Film already exist',
          field: 'kpId',
        });
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);
      const previousHandleStatus = existingFilm?.handleStatus ?? null;

      const film = existingFilm
        ? await this.updateExistingFilm(existingFilm, metadata, key, duration || 0, kpId)
        : this.createNewFilm(metadata, key, duration || 0, kpId);

      film.updateAvailabilityStatus(MovieAvailabilityStatus.AVAILABLE);
      this.moviesService.setHandleProductionStatus(film);

      const savedFilm = await this.filmRepository.save(film, queryRunner);

      if (!existingFilm) {
        const { titleUrl, posterUrl, backgroundContentUrl } = await this.getContentUrlForNewFilm(
          savedFilm.id,
          metadata.trailerUrl,
          metadata.backdropUrl,
          metadata.titleUrl,
          metadata.posterUrl,
        );

        film.updateBackgroundUrl(backgroundContentUrl);
        film.updatePosterUrl(posterUrl);
        film.updateTitleUrl(titleUrl);

        this.moviesService.setHandleProductionStatus(film);

        await this.filmRepository.save(film, queryRunner);
      }

      if (film.handleStatus === MovieHandleStatus.MODERATE) {
        this.logger.log('Film sent to moderation', this.execute.name);
        const moderationResult = await this.movieModeration(film, queryRunner);

        this.publish(moderationResult);
      } else if (
        film.handleStatus === MovieHandleStatus.PRODUCTION &&
        previousHandleStatus !== MovieHandleStatus.PRODUCTION
      ) {
        this.publishWithoutModeration(film.id);
      }

      await queryRunner.commitTransaction();
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();
      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }

  private isAlreadyPlayableOrModerating(film: Film | null): boolean {
    if (!film) return false;
    if (film.handleStatus === MovieHandleStatus.MODERATE) return true;
    return film.handleStatus === MovieHandleStatus.PRODUCTION && Boolean(film.videoUrl);
  }

  private async updateExistingFilm(
    film: Film,
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Promise<Film> {
    const { id } = film;
    const backgroundSourceUrl = metadata.backdropUrl || metadata.trailerUrl;
    const [previewUrl, backgroundContentUrl, titleUrl] = await Promise.all([
      !film.previewUrl
        ? this.moviesService.getPosterUrl(metadata.posterUrl, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),

      !film.backgroundContentUrl
        ? this.moviesService.getBackgroundContentUrl(backgroundSourceUrl, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),

      !film.titleUrl
        ? this.moviesService.getLogoUrl(metadata.titleUrl, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),
    ]);

    const filmDto: FilmUpdateDto = {
      videUrl: key,
      kpId,
      duration: duration || 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      universe: metadata.universe,
      studio: metadata.studio,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      previewUrl: film.previewUrl || previewUrl || null,
      horizontalPreviewUrl: null,
      backgroundContentUrl: film.backgroundContentUrl || backgroundContentUrl || null,
      trailerUrl: film.trailerUrl || metadata.trailerUrl,
      titleUrl: film.titleUrl || titleUrl || null,
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
    const filmDto: FilmCreateDto = {
      key,
      kpId,
      duration: duration || 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      hidden: false,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      universe: metadata.universe,
      studio: metadata.studio,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      handleStatus: MovieHandleStatus.PROCESSING,
      previewUrl: null,
      horizontalPreviewUrl: null,
      backgroundContentUrl: null,
      trailerUrl: metadata.trailerUrl,
      titleUrl: null,
    };
    return this.filmEntity.create(filmDto);
  }

  private async movieModeration(film: Film, queryRunner: QueryRunner): Promise<number> {
    const { id } = film;
    const createModerationDto: CreateModerationDto = {
      movieId: id,
    };

    const newModeration =
      this.moderationFilmEntity.create<ModerationFilmEntity>(createModerationDto);

    const moderationResult = await this.moderationFilmRepository.save(newModeration, queryRunner);

    const { id: moderationId } = moderationResult;

    return moderationId;
  }

  private async getContentUrlForNewFilm(
    filmId: number,
    trailerUrl: string | null,
    backdropUrl: string | null,
    logoUrl: string | null,
    previewUrl: string | null,
  ) {
    const backgroundSourceUrl = backdropUrl || trailerUrl;
    const [backgroundContentUrl, posterUrl, titleUrl] = await Promise.all([
      this.moviesService.getBackgroundContentUrl(backgroundSourceUrl, filmId, MovieTypesEnum.FILM),
      this.moviesService.getPosterUrl(previewUrl, filmId, MovieTypesEnum.FILM),
      this.moviesService.getLogoUrl(logoUrl, filmId, MovieTypesEnum.FILM),
    ]);

    return {
      backgroundContentUrl,
      posterUrl,
      titleUrl,
    };
  }

  private publish(moderationId: number): void {
    void this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(
        MovieTypesEnum.FILM,
        moderationId,
      ),
    );
  }

  private publishWithoutModeration(movieId: number): void {
    void this.commandBus.execute(
      new TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand(
        MovieTypesEnum.FILM,
        movieId,
      ),
    );
  }
}
