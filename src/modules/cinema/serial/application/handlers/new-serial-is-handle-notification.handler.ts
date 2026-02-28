import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';

import { Serial } from '@/serials/domain/serial.entity';
import { SerialCreateDto } from '@/serials/domain/types';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';

export class NewSerialIsHandleNotificationCommand implements ICommand {
  constructor(public inputDto: NewMovieIsHandleNotificationPayloadDto) {}
}

@CommandHandler(NewSerialIsHandleNotificationCommand)
export class NewSerialIsHandleNotificationCommandHandler
  implements
    ICommandHandler<
      NewSerialIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Serial.name) private readonly serialEntity: typeof Serial,
    private readonly serialRepository: SerialRepository,
    private readonly kinopoiskService: KinopoiskService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewSerialIsHandleNotificationCommandHandler.name);
  }

  async execute(
    command: NewSerialIsHandleNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpIds } = inputDto;
    this.logger.log(`New serial is handle notification command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      for (const kpId of kpIds) {
        await this.processSerial(kpId, queryRunner);
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

  private async processSerial(kpId: string, queryRunner: QueryRunner): Promise<void> {
    const [kpMovie, serial] = await Promise.all([
      this.kinopoiskService.getMovieById(Number(kpId)),
      this.serialRepository.getSerialByKinopoiskId(kpId, queryRunner),
    ]);

    if (serial) {
      this.logger.warn('Serial already exist', this.processSerial.name);

      return;
    }

    if (!kpMovie) {
      this.logger.warn('Serial not found in kinopoisk api', this.processSerial.name);

      return;
    }

    const { name } = kpMovie;

    const serialDto: SerialCreateDto = {
      key: null,
      kpId,
      duration: 0,
      name: name || 'unknown',
      originalName: null,
      hidden: true,
      genres: null,
      alternativeName: null,
      country: null,
      description: null,
      releaseDate: null,
      handleStatus: MovieHandleStatus.PROCESSING,
      titleUrl: null,
      trailerUrl: null,
      previewUrl: null,
      backgroundContentUrl: null,
    };

    const newSerial = this.serialEntity.create(serialDto);

    await this.serialRepository.save(newSerial, queryRunner);
  }
}
