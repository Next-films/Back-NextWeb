import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, QueryRunner } from 'typeorm';

import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MoviesService } from '@/movies/application/movies.service';
import { MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { MovieTypesEnum } from '@/common/types/types';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';

import { Serial } from '@/serials/domain/serial.entity';
import { SerialCreateDto, SerialUpdateDto } from '@/serials/domain/types';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { NewSerialNotificationPayloadDto } from '@/serials/api/dtos/input/new-serial-notification.input.dto';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { SerialSeason } from '@/serials/domain/serial-season.entity';

export class NewSerialNotificationCommand implements ICommand {
  constructor(public inputDto: NewSerialNotificationPayloadDto) {}
}

@CommandHandler(NewSerialNotificationCommand)
export class NewSerialNotificationCommandHandler
  implements
    ICommandHandler<
      NewSerialNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Serial.name) private readonly serialEntity: typeof Serial,
    private readonly serialRepository: SerialRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly moderationSerialRepository: ModerationSerialRepository,
    @Inject(ModerationSerialEntity.name)
    private readonly moderationSerialEntity: typeof ModerationSerialEntity,
    private readonly commandBus: CommandBus,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewSerialNotificationCommandHandler.name);
  }

  async execute(
    command: NewSerialNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpId, key, duration, seasonNumber, episodeNumber } = inputDto;
    this.logger.log(`New serial notification command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [kpMovie, existingSerial] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.serialRepository.getSerialByKinopoiskId(kpId, queryRunner),
      ]);

      // For serials we allow repeated notifications to append missing episodes/new seasons.
      if (this.moviesService.isFilmInProductionOrModerate(existingSerial)) {
        this.logger.log(
          `Serial already exists (kpId: ${kpId}), continue in append mode`,
          this.execute.name,
        );
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);

      const serial = existingSerial
        ? await this.updateExistingSerial(existingSerial, metadata, key, duration || 0, kpId)
        : this.createNewSerial(metadata, key, duration || 0, kpId);

      this.attachEpisode(serial, key, duration || 0, seasonNumber, episodeNumber);

      this.moviesService.setHandleProductionStatus(serial);

      const savedSerial = await this.serialRepository.save(serial, queryRunner);

      if (!existingSerial) {
        const { titleUrl, posterUrl, backgroundContentUrl } = await this.getContentUrlForNewSerial(
          savedSerial.id,
          metadata.trailerUrl,
          metadata.titleUrl,
          metadata.posterUrl,
        );

        serial.updateBackgroundUrl(backgroundContentUrl);
        serial.updatePosterUrl(posterUrl);
        serial.updateTitleUrl(titleUrl);

        this.moviesService.setHandleProductionStatus(serial);

        await this.serialRepository.save(serial, queryRunner);
      }

      // New serials must pass admin moderation before becoming publicly available.
      if (!existingSerial && serial.handleStatus === MovieHandleStatus.PRODUCTION) {
        serial.updateHandleStatus(MovieHandleStatus.MODERATE);
        await this.serialRepository.save(serial, queryRunner);
      }

      if (serial.handleStatus === MovieHandleStatus.MODERATE) {
        this.logger.log('Serial sent to moderation', this.execute.name);
        const moderationResult = await this.movieModeration(serial, queryRunner);

        if (moderationResult.isNew) {
          this.publish(moderationResult.id);
        }
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

  private attachEpisode(
    serial: Serial,
    key: string,
    duration: number,
    seasonNumber?: number,
    episodeNumber?: number,
  ): void {
    const previewUrl = serial.previewUrl || serial.backgroundContentUrl || serial.titleUrl || key;
    const releaseDate = serial.releaseDate ? new Date(serial.releaseDate) : new Date();
    const normalizedDuration = this.normalizeDuration(duration);

    if (!serial.episodes) {
      serial.episodes = [];
    }
    if (!serial.seasons) {
      serial.seasons = [];
    }

    const existingEpisode = serial.episodes.find(e => e.videoUrl === key);
    if (existingEpisode) {
      if ((existingEpisode.duration ?? 0) <= 0 && normalizedDuration > 0) {
        existingEpisode.duration = normalizedDuration;
      }
      return;
    }

    const season = this.getOrCreateSeason(serial, seasonNumber || 1);
    if (!season.episodes) season.episodes = [];

    const nextEpisodeNumber = episodeNumber || season.episodes.length + 1;
    const title = `Эпизод ${nextEpisodeNumber}`;
    const episode: Partial<SerialEpisode> = {
      title,
      originalTitle: serial.originalTitle || serial.title,
      description: serial.description,
      previewUrl,
      releaseDate,
      videoUrl: key,
      duration: normalizedDuration,
      season,
      seasonId: season.id || null,
    };

    serial.episodes.push(episode as SerialEpisode);
    season.episodes.push(episode as SerialEpisode);
  }

  private getOrCreateSeason(serial: Serial, seasonNumber: number): SerialSeason {
    let season = serial.seasons?.find(s => s.seasonNumber === seasonNumber);

    if (!season) {
      season = new SerialSeason();
      season.seasonNumber = seasonNumber;
      season.serial = serial;
      season.serialId = serial.id;
      season.episodes = [];

      serial.seasons?.push(season);
    }

    return season;
  }

  private async updateExistingSerial(
    serial: Serial,
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Promise<Serial> {
    const { id } = serial;
    const [previewUrl, backgroundContentUrl, titleUrl] = await Promise.all([
      !serial.previewUrl
        ? this.moviesService.getPosterUrl(metadata.posterUrl, id, MovieTypesEnum.SERIAL)
        : Promise.resolve(null),

      !serial.backgroundContentUrl
        ? this.moviesService.getBackgroundContentUrl(metadata.trailerUrl, id, MovieTypesEnum.SERIAL)
        : Promise.resolve(null),

      !serial.titleUrl
        ? this.moviesService.getLogoUrl(metadata.titleUrl, id, MovieTypesEnum.SERIAL)
        : Promise.resolve(null),
    ]);

    const serialDto: SerialUpdateDto = {
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
      previewUrl: serial.previewUrl || previewUrl || null,
      backgroundContentUrl: serial.backgroundContentUrl || backgroundContentUrl || null,
      trailerUrl: serial.trailerUrl || metadata.trailerUrl,
      titleUrl: serial.titleUrl || titleUrl || null,
    };
    serial.update(serialDto);
    return serial;
  }

  private createNewSerial(
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Serial {
    const serialDto: SerialCreateDto = {
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
      backgroundContentUrl: null,
      trailerUrl: metadata.trailerUrl,
      titleUrl: null,
    };
    return this.serialEntity.create(serialDto);
  }

  private async movieModeration(
    serial: Serial,
    queryRunner: QueryRunner,
  ): Promise<{ id: number; isNew: boolean }> {
    const { id } = serial;

    const existingModeration = await this.moderationSerialRepository.getModerationByMovieId(
      id,
      queryRunner,
    );

    if (existingModeration) {
      return { id: existingModeration.id, isNew: false };
    }

    const createModerationDto: CreateModerationDto = {
      movieId: id,
    };

    const newModeration =
      this.moderationSerialEntity.create<ModerationSerialEntity>(createModerationDto);

    let moderationResult: ModerationSerialEntity;
    try {
      moderationResult = await this.moderationSerialRepository.save(newModeration, queryRunner);
    } catch (error) {
      if (!this.isDuplicateModerationMovieIdError(error)) {
        throw error;
      }

      const concurrentModeration = await this.moderationSerialRepository.getModerationByMovieId(
        id,
        queryRunner,
      );

      if (!concurrentModeration) {
        throw error;
      }

      return { id: concurrentModeration.id, isNew: false };
    }

    const { id: moderationId } = moderationResult;

    return { id: moderationId, isNew: true };
  }

  private isDuplicateModerationMovieIdError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const pgCode = (error as QueryFailedError & { code?: string }).code;
    if (pgCode === '23505') return true;

    const message = (error as Error).message || '';
    return message.includes('duplicate key value') && message.includes('movieId');
  }

  private normalizeDuration(duration: number | null | undefined): number {
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      return 0;
    }

    return Math.round(duration);
  }

  private async getContentUrlForNewSerial(
    serialId: number,
    trailerUrl: string | null,
    logoUrl: string | null,
    previewUrl: string | null,
  ) {
    const [backgroundContentUrl, posterUrl, titleUrl] = await Promise.all([
      this.moviesService.getBackgroundContentUrl(trailerUrl, serialId, MovieTypesEnum.SERIAL),
      this.moviesService.getPosterUrl(previewUrl, serialId, MovieTypesEnum.SERIAL),
      this.moviesService.getLogoUrl(logoUrl, serialId, MovieTypesEnum.SERIAL),
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
        MovieTypesEnum.SERIAL,
        moderationId,
      ),
    );
  }
}
