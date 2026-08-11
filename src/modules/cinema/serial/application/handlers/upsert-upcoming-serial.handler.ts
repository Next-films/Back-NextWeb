import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
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

export class UpsertUpcomingSerialCommand implements ICommand {
  constructor(public inputDto: UpsertUpcomingMoviePayloadDto) {}
}

@CommandHandler(UpsertUpcomingSerialCommand)
export class UpsertUpcomingSerialCommandHandler
  implements
    ICommandHandler<
      UpsertUpcomingSerialCommand,
      AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Serial.name) private readonly serialEntity: typeof Serial,
    private readonly serialRepository: SerialRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly movieMetadataCardService: MovieMetadataCardService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(UpsertUpcomingSerialCommandHandler.name);
  }

  async execute(
    command: UpsertUpcomingSerialCommand,
  ): Promise<AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = command.inputDto;
    this.logger.log(`Upsert upcoming serial card command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [kpMovie, existingSerial] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.serialRepository.getSerialByKinopoiskId(kpId, queryRunner),
      ]);

      if (!kpMovie) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Serial not found in kinopoisk',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });
      }

      if (existingSerial && (existingSerial.episodes || []).length > 0) {
        await queryRunner.commitTransaction();
        return this.appNotification.success(new UpsertUpcomingMovieOutputDto(true));
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);
      if (!this.movieMetadataCardService.shouldPublishUpcomingCard(metadata)) {
        await queryRunner.commitTransaction();
        return this.appNotification.success(new UpsertUpcomingMovieOutputDto(true));
      }

      const serial = existingSerial
        ? this.movieMetadataCardService.updateExistingMovie(existingSerial, metadata, kpId)
        : this.serialEntity.create(this.movieMetadataCardService.createMovieDto(metadata, kpId));

      const savedSerial = await this.serialRepository.save(serial, queryRunner);

      await this.movieMetadataCardService.hydrateNewMovieAssets(
        savedSerial,
        metadata,
        MovieTypesEnum.SERIAL,
      );
      await this.serialRepository.save(savedSerial, queryRunner);

      await queryRunner.commitTransaction();
      return this.appNotification.success(
        new UpsertUpcomingMovieOutputDto(savedSerial.handleStatus === MovieHandleStatus.PRODUCTION),
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
