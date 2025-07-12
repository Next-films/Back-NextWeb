import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerateRequestPayloadDto } from '@/admin/api/dtos/input/admin-moderate-movie.input.dto';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { MovieCreateDto, MovieHandleStatus } from '@/movies/domain/types';
import { Inject } from '@nestjs/common';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { IAdminModerationMovieTaskCreateByTorrentStrategy } from '@/admin/domain/types';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';

export class AdminModerateRequestByTorrentCommand implements ICommand {
  constructor(public inputDto: ModerateRequestPayloadDto) {}
}

@CommandHandler(AdminModerateRequestByTorrentCommand)
export class AdminModerateRequestByTorrentCommandHandler
  implements
    ICommandHandler<
      AdminModerateRequestByTorrentCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly filmRepository: FilmRepository,
    private readonly cartoonRepository: CartoonRepository,
    private readonly commandBus: CommandBus,
    @Inject(Film.name) private readonly filmEntity: typeof Film,
    @Inject(Cartoon.name) private readonly cartoonEntity: typeof Cartoon,
    @Inject(ModerationFilmEntity.name)
    private readonly moderationFilmEntity: typeof ModerationFilmEntity,
    @Inject(ModerationCartoonEntity.name)
    private readonly moderationCartoonEntity: typeof ModerationCartoonEntity,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    private readonly finishedTorrentModerationRepository: FinishedTorrentModerationRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminModerateRequestByTorrentCommandHandler.name);
  }
  async execute(
    command: AdminModerateRequestByTorrentCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Moderate request movie by torrent command`, this.execute.name);
    const { inputDto } = command;
    const { type, torrent, movieName, kpId } = inputDto;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const finishedTorrentModeration = await this.finishedTorrentModerationRepository.getByKpId(
        kpId,
        queryRunner,
      );

      if (finishedTorrentModeration) {
        this.logger.log(`Movie already moderated by torrent`, this.execute.name);

        return this.appNotification.badRequest({
          message: 'Movie already moderated by torrent',
          field: 'kpId',
          errorKey: EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_MODERATED_BY_TORRENT,
        });
      }

      const strategy = this.getStrategyByType(type, queryRunner);

      if (!strategy) {
        this.logger.log(`Undefined movie type`, this.execute.name);
        return this.appNotification.badRequest({
          message: 'Undefined movie type',
          field: 'type',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_MOVIE_TYPE,
        });
      }

      const movie = await strategy.getMovie(kpId);

      // TODO: Обработка если фильм уже существует ?
      if (movie)
        return this.appNotification.badRequest({
          message: 'Movie already exist and moderate',
          errorKey: EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_EXIST,
          field: 'kpId',
        });

      const createDto: MovieCreateDto = {
        kpId,
        hidden: true,
        handleStatus: MovieHandleStatus.MODERATE,
        name: movieName || 'unknown',
        duration: 0,
        country: null,
        alternativeName: 'unknown',
        description: null,
        genres: null,
        key: null,
        releaseDate: null,
        originalName: null,
        backgroundContentUrl: null,
        trailerUrl: null,
        previewUrl: null,
        titleUrl: null,
      };

      const newMovie = strategy.createMovie(createDto);

      const result = await strategy.saveMovie(newMovie);

      const { id: movieId } = result;

      const createModerationDto: CreateModerationDto = {
        movieId,
        torrentMetaData: torrent,
      };

      const newModeration = strategy.createModerationMovieTask(createModerationDto);

      const moderationResult = await strategy.saveModerationMovieTask(newModeration);

      const { id: moderationId } = moderationResult;

      this.publish(type, moderationId);

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

  private publish(type: MovieTypesEnum, moderationId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(type, moderationId),
    );
  }

  private getStrategyByType(
    type: MovieTypesEnum,
    queryRunner: QueryRunner,
  ): IAdminModerationMovieTaskCreateByTorrentStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getMovie: (...args): Promise<Film | null> =>
            this.filmRepository.getFilmByKinopoiskId(...args, queryRunner),
          createMovie: (...args) => this.filmEntity.create(...args),
          saveMovie: (movie: Film) => this.filmRepository.save(movie, queryRunner),
          createModerationMovieTask: (...args): ModerationFilmEntity =>
            this.moderationFilmEntity.create(...args),
          saveModerationMovieTask: (task: ModerationFilmEntity): Promise<ModerationFilmEntity> =>
            this.moderationFilmRepository.save(task, queryRunner),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getMovie: (...args): Promise<Cartoon | null> =>
            this.cartoonRepository.getCartoonByKinopoiskId(...args, queryRunner),
          createMovie: (...args) => this.cartoonEntity.create(...args),
          saveMovie: (movie: Cartoon) => this.cartoonRepository.save(movie, queryRunner),
          createModerationMovieTask: (...args): ModerationCartoonEntity =>
            this.moderationCartoonEntity.create(...args),
          saveModerationMovieTask: (
            task: ModerationCartoonEntity,
          ): Promise<ModerationCartoonEntity> =>
            this.moderationCartoonRepository.save(task, queryRunner),
        };

      case MovieTypesEnum.SERIAL:
        return null; // TODO: реализовать
      default:
        return null;
    }
  }
}
