import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { Film } from '@/films/domain/film.entity';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MoviesService } from '@/movies/application/movies.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UpsertUpcomingMoviePayloadDto } from '@/movies/api/dtos/input/upsert-upcoming-movie.input.dto';
import { MovieMetadataCardService } from '@/movies/application/movie-metadata-card.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum } from '@/common/types/types';
import { MovieHandleStatus } from '@/movies/domain/types';
import { UpsertUpcomingMovieOutputDto } from '@/movies/api/dtos/output/upsert-upcoming-movie.output.dto';

export class UpsertUpcomingFilmCommand implements ICommand {
  constructor(public inputDto: UpsertUpcomingMoviePayloadDto) {}
}

@CommandHandler(UpsertUpcomingFilmCommand)
export class UpsertUpcomingFilmCommandHandler
  implements
    ICommandHandler<
      UpsertUpcomingFilmCommand,
      AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Film.name) private readonly filmEntity: typeof Film,
    private readonly filmRepository: FilmRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly movieMetadataCardService: MovieMetadataCardService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(UpsertUpcomingFilmCommandHandler.name);
  }

  async execute(
    command: UpsertUpcomingFilmCommand,
  ): Promise<AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = command.inputDto;
    this.logger.log(`Upsert upcoming film card command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [kpMovie, existingFilm] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.filmRepository.getFilmByKinopoiskId(kpId, queryRunner),
      ]);

      if (!kpMovie) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Film not found in kinopoisk',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });
      }

      if (existingFilm?.videoUrl) {
        await queryRunner.commitTransaction();
        return this.appNotification.success(new UpsertUpcomingMovieOutputDto(true));
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);
      if (!this.movieMetadataCardService.shouldPublishUpcomingCard(metadata)) {
        await queryRunner.commitTransaction();
        return this.appNotification.success(new UpsertUpcomingMovieOutputDto(true));
      }

      const film = existingFilm
        ? this.movieMetadataCardService.updateExistingMovie(existingFilm, metadata, kpId)
        : this.filmEntity.create(this.movieMetadataCardService.createMovieDto(metadata, kpId));

      const savedFilm = await this.filmRepository.save(film, queryRunner);

      await this.movieMetadataCardService.hydrateNewMovieAssets(
        savedFilm,
        metadata,
        MovieTypesEnum.FILM,
      );
      await this.filmRepository.save(savedFilm, queryRunner);

      await queryRunner.commitTransaction();
      return this.appNotification.success(
        new UpsertUpcomingMovieOutputDto(savedFilm.handleStatus === MovieHandleStatus.PRODUCTION),
      );
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();
      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }
}
