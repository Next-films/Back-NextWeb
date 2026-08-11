import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  FindTorApiTorrentFilmType,
  MovieTypesEnum,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ICancelModerationMovieTaskByIdStrategy } from '@/admin/domain/types';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { Serial } from '@/serials/domain/serial.entity';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { AdminApplyModerationMovieTaskInputDto } from '@/admin/api/dtos/input/admin-apply-moderation-movie-task.input.dto';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { TelegramAdminBotSendNotificationAdminFinishedModerationCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-finished-moderation.handler';
import { MoviesService } from '@/movies/application/movies.service';
import { FilmUpdateDto } from '@/films/domain/types';
import { DateUtil } from '@/common/utils/date.util';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieHandleStatus } from '@/movies/domain/types';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { TelegramAdminBotSendNotificationAdminAcceptModerationCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-admin-accept-moderation.handler';

export class AdminApplyModerationMovieTaskCommand implements ICommand {
  constructor(
    public taskId: number,
    public adminId: number,
    public inputDto: AdminApplyModerationMovieTaskInputDto,
  ) {}
}

@CommandHandler(AdminApplyModerationMovieTaskCommand)
export class AdminApplyModerationMovieTaskCommandHandler
  implements
    ICommandHandler<
      AdminApplyModerationMovieTaskCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly moderationFilmRepository: ModerationFilmRepository,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    private readonly moderationSerialRepository: ModerationSerialRepository,
    private readonly filmRepository: FilmRepository,
    private readonly adminRepository: AdminRepository,
    private readonly finishedTorrentModerationRepository: FinishedTorrentModerationRepository,
    private readonly cartoonRepository: CartoonRepository,
    private readonly serialRepository: SerialRepository,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly moviesService: MoviesService,
    private readonly dateUtil: DateUtil,
    @Inject(FinishedTorrentModerationEntity.name)
    private readonly finishedTorrentModerationEntity: typeof FinishedTorrentModerationEntity,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminApplyModerationMovieTaskCommandHandler.name);
  }
  async execute(
    command: AdminApplyModerationMovieTaskCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Apply moderation movie task command`, this.execute.name);
    const { taskId, inputDto, adminId } = command;
    const { type, provider, providerId } = inputDto;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const strategy = this.getStrategyByType(type, queryRunner);
      if (!strategy) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          field: 'type',
          message: 'Undefined movie type',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_MOVIE_TYPE,
        });
      }

      const task = await strategy.getTask(taskId);

      if (!task) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'taskId',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          message: 'Task not found',
        });
      }

      const { admin: attachedAdmin, torrentData, movie } = task;

      if (!attachedAdmin) {
        const admin = await this.adminRepository.getAdminById(adminId, queryRunner);
        if (!admin) {
          await queryRunner.rollbackTransaction();

          return this.appNotification.unauthorized({
            field: 'token',
            errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
            message: 'Unauthorized',
          });
        }

        task.attachAdmin(admin);
        if (!strategy.saveTask) {
          await queryRunner.rollbackTransaction();

          return this.appNotification.internalServerError();
        }
        await strategy.saveTask(task);

        this.publishAccepted(type, taskId);

        await queryRunner.commitTransaction();
        return this.appNotification.success(null);
      }

      const { id: attachedAdminId } = attachedAdmin;

      if (attachedAdminId !== adminId) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.forbidden({
          message: 'The task does not belong to the current user',
          errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_BELONG_YOU,
          field: 'taskId',
        });
      }

      let validationResult: AppNotificationResult<null, ErrorFieldExceptionDto | null> | null =
        null;

      const uploadedBackgroundContentUrl = await this.uploadBackgroundUrlByInput(
        movie,
        type,
        inputDto.backgroundContentUrl,
      );

      if (typeof inputDto.backgroundContentUrl === 'string' && !uploadedBackgroundContentUrl) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          field: 'backgroundContentUrl',
          errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
          message:
            'Failed to upload horizontal preview to file storage. Verify URL/file and retry.',
        });
      }

      if (uploadedBackgroundContentUrl) {
        inputDto.backgroundContentUrl = uploadedBackgroundContentUrl;
      }

      await this.updateMovie(movie, inputDto, queryRunner);

      if (torrentData) {
        validationResult = await this.torrentValidation(
          torrentData,
          provider || null,
          providerId || null,
          type,
        );
        movie.showOrHiddeMovie(true, MovieHandleStatus.PROCESSING);
      } else {
        validationResult = this.validateMovie(movie);
      }

      if (validationResult) {
        await queryRunner.rollbackTransaction();
        return validationResult;
      }

      const { id: movieId } = movie;

      const newFinishedTorrentModeration = await this.finishModeration(task, queryRunner);

      const promises = [strategy.removeTask(task), strategy.saveMovie(movie)];

      if (newFinishedTorrentModeration)
        promises.push(
          this.finishedTorrentModerationRepository.save(newFinishedTorrentModeration, queryRunner),
        );

      await Promise.all(promises);

      this.publish(type, adminId, movieId);

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

  private async updateMovie<T extends MovieEntity>(
    movie: T,
    inputDto: AdminApplyModerationMovieTaskInputDto,
    queryRunner: QueryRunner,
  ) {
    const {
      genres: rawGenres,
      releaseDate,
      duration,
      videUrl,
      backgroundContentUrl,
      titleUrl,
      previewUrl,
      country,
      description,
      name,
      originalName,
      alternativeName,
      trailerUrl,
      kpId,
    } = inputDto;

    const genres =
      rawGenres && rawGenres.length > 0
        ? await this.moviesService.getOrCreateGenre(rawGenres, queryRunner)
        : movie.genres || [];

    const updatedDto: FilmUpdateDto = {
      name: name ?? movie.title,
      kpId: kpId ?? movie.kpId,
      genres,
      releaseDate: releaseDate
        ? this.dateUtil.formatDateYyMmDd(releaseDate)
        : movie.releaseDate ?? null,
      duration: duration ?? movie.duration ?? 0,
      videUrl: videUrl ?? movie.videoUrl ?? null,
      backgroundContentUrl: backgroundContentUrl ?? movie.backgroundContentUrl ?? null,
      horizontalPreviewUrl: null,
      titleUrl: titleUrl ?? movie.titleUrl ?? null,
      previewUrl: previewUrl ?? movie.previewUrl ?? null,
      description: description ?? movie.description ?? null,
      originalName: originalName ?? movie.originalTitle ?? null,
      alternativeName: alternativeName ?? movie.alternativeTitles ?? null,
      country: country && country.length > 0 ? country : movie.country ?? null,
      trailerUrl: trailerUrl ?? movie.trailerUrl ?? null,
    };

    movie.update(updatedDto);
  }

  private async torrentValidation(
    torrentData: FindTorApiTorrentFilmType,
    provider: TorApiProvidersEnum | null,
    providerId: string | null,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | null> {
    if (!torrentData)
      return this.appNotification.notFound({
        field: 'provider',
        errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_FOUND,
        message: 'Provider not found',
      });

    if (!provider || !providerId)
      return this.appNotification.badRequest({
        field: 'provider',
        errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_PASSED,
        message: 'Information about the provider must be transmitted',
      });

    const matchedProviderKey = Object.keys(torrentData).find(
      key => key.toLowerCase() === provider.toLowerCase(),
    );

    if (!matchedProviderKey)
      return this.appNotification.notFound({
        field: 'provider',
        errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_FOUND,
        message: 'Provider not found',
      });

    const providerData: TorApiMovieById[] = torrentData[matchedProviderKey];

    if (!providerData)
      return this.appNotification.notFound({
        field: 'provider',
        errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_FOUND,
        message: 'Provider not found',
      });

    const torrentMovie = providerData.find(i => i.Id === providerId);

    if (!torrentMovie)
      return this.appNotification.notFound({
        field: 'providerId',
        errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_MOVIE_NOT_FOUND,
        message: 'Provider movie not found',
      });

    await this.rmqResultHandlerUtil.getRmqData(
      () => this.downloaderServiceAdapter.addMovieToQueue(torrentMovie, provider, type),
      'Add movie to download queue',
    );

    return null;
  }

  private validateMovie<T extends MovieEntity>(
    movie: T,
  ): AppNotificationResult<null, ErrorFieldExceptionDto | null> | null {
    const isValidMovieForProduction = this.moviesService.isValidMovieForProduction(movie);

    if (!isValidMovieForProduction)
      return this.appNotification.badRequest({
        message: 'A movie cannot be accepted without moderation of the required keys.',
        errorKey: EXCEPTION_KEYS_ENUM.MOVIE_NOT_MODERATED,
        field: 'taskId',
      });

    movie.showOrHiddeMovie(false, MovieHandleStatus.PRODUCTION);
    return null;
  }

  private async finishModeration<T extends ModerationMovieEntity>(
    task: T,
    queryRunner: QueryRunner,
  ): Promise<FinishedTorrentModerationEntity | null> {
    const { movie, admin } = task;
    const { kpId } = movie;
    const { id } = admin;
    const finishedTorrentModeration = await this.finishedTorrentModerationRepository.getByKpId(
      kpId,
      queryRunner,
    );

    let newFinishedTorrentModeration: FinishedTorrentModerationEntity | null = null;
    if (!finishedTorrentModeration) {
      newFinishedTorrentModeration = this.finishedTorrentModerationEntity.create(id, kpId);
    }

    return newFinishedTorrentModeration;
  }

  private publish(type: MovieTypesEnum, adminId: number, movieId: number): void {
    void this.commandBus.execute(
      new TelegramAdminBotSendNotificationAdminFinishedModerationCommand(type, adminId, movieId),
    );
  }

  private publishAccepted(type: MovieTypesEnum, taskId: number): void {
    void this.commandBus.execute(
      new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(type, taskId),
    );
  }

  private getStrategyByType(
    type: MovieTypesEnum,
    queryRunner: QueryRunner,
  ): ICancelModerationMovieTaskByIdStrategy | null {
    switch (type) {
      case MovieTypesEnum.FILM:
        return {
          getTask: (...args) =>
            this.moderationFilmRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          saveTask: (task: ModerationFilmEntity) =>
            this.moderationFilmRepository.save(task, queryRunner),
          removeTask: (task: ModerationFilmEntity) =>
            this.moderationFilmRepository.removeTask(task, queryRunner),
          saveMovie: (movie: Film) => this.filmRepository.save(movie, queryRunner),
        };

      case MovieTypesEnum.CARTOON:
        return {
          getTask: (...args) =>
            this.moderationCartoonRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          saveTask: (task: ModerationCartoonEntity) =>
            this.moderationCartoonRepository.save(task, queryRunner),
          removeTask: (task: ModerationCartoonEntity) =>
            this.moderationCartoonRepository.removeTask(task, queryRunner),
          saveMovie: (movie: Cartoon) => this.cartoonRepository.save(movie, queryRunner),
        };

      case MovieTypesEnum.SERIAL:
        return {
          getTask: (...args) =>
            this.moderationSerialRepository.getModerationByIdWithMovieAndAdminInfo(
              ...args,
              queryRunner,
            ),
          saveTask: (task: ModerationSerialEntity) =>
            this.moderationSerialRepository.save(task, queryRunner),
          removeTask: (task: ModerationSerialEntity) =>
            this.moderationSerialRepository.removeTask(task, queryRunner),
          saveMovie: (movie: Serial) => this.serialRepository.save(movie, queryRunner),
        };
      default:
        return null;
    }
  }

  private async uploadBackgroundUrlByInput<T extends MovieEntity>(
    movie: T,
    type: MovieTypesEnum,
    backgroundContentUrl?: string,
  ): Promise<string | null | undefined> {
    if (typeof backgroundContentUrl !== 'string') return undefined;

    const normalizedBackgroundContentUrl = backgroundContentUrl.trim();
    if (!normalizedBackgroundContentUrl) return null;

    if (normalizedBackgroundContentUrl === movie.backgroundContentUrl) {
      return movie.backgroundContentUrl;
    }

    return this.moviesService.getBackgroundContentUrl(
      normalizedBackgroundContentUrl,
      movie.id,
      type,
    );
  }
}
