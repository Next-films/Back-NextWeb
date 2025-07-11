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
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { FilmCreateDto } from '@/films/domain/types';
import { Film } from '@/films/domain/film.entity';
import { MovieHandleStatus } from '@/movies/domain/types';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MoviesService } from '@/movies/application/movies.service';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';

export class NewFilmIsHandleNotificationCommand implements ICommand {
  constructor(public inputDto: NewMovieIsHandleNotificationPayloadDto) {}
}

@CommandHandler(NewFilmIsHandleNotificationCommand)
export class NewFilmIsHandleNotificationCommandHandler
  implements
    ICommandHandler<
      NewFilmIsHandleNotificationCommand,
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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewFilmIsHandleNotificationCommandHandler.name);
  }

  async execute(
    command: NewFilmIsHandleNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpIds } = inputDto;
    this.logger.log(`New film is handle notification command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      for (const kpId of kpIds) {
        await this.processFilm(kpId, queryRunner);
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

  // TODO: доработать трейлеры и фото
  private async processFilm(kpId: string, queryRunner: QueryRunner): Promise<void> {
    const [kpMovie, film] = await Promise.all([
      this.kinopoiskService.getMovieById(Number(kpId)),
      this.filmRepository.getFilmByKinopoiskId(kpId, queryRunner),
    ]);

    if (film) {
      this.logger.warn('Film already exist', this.processFilm.name);

      return;
    }

    if (!kpMovie) {
      this.logger.warn('Film not found in kinopoisk api', this.processFilm.name);

      return;
    }

    const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);
    const { description, genres, alternativeName, name, originalName, releaseDate, countries } =
      metadata;

    const filmDto: FilmCreateDto = {
      key: null,
      kpId,
      duration: 0,
      name: name || 'unknown',
      originalName,
      hidden: true,
      genres,
      alternativeName,
      country: countries,
      description: description || null,
      releaseDate: releaseDate,
      handleStatus: MovieHandleStatus.PROCESSING,
    };

    const newFilm = this.filmEntity.create(filmDto);

    await this.filmRepository.save(newFilm, queryRunner);
  }
}
