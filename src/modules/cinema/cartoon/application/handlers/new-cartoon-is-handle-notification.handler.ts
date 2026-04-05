import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { CartonCreateDto } from '@/cartoons/domain/types';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';

export class NewCartoonIsHandleNotificationCommand implements ICommand {
  constructor(public inputDto: NewMovieIsHandleNotificationPayloadDto) {}
}

@CommandHandler(NewCartoonIsHandleNotificationCommand)
export class NewCartoonIsHandleNotificationCommandHandler
  implements
    ICommandHandler<
      NewCartoonIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Cartoon.name) private readonly cartoonEntity: typeof Cartoon,
    private readonly cartoonRepository: CartoonRepository,
    private readonly kinopoiskService: KinopoiskService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewCartoonIsHandleNotificationCommandHandler.name);
  }

  async execute(
    command: NewCartoonIsHandleNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpIds } = inputDto;
    this.logger.log(`New cartoon is handle notification command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      for (const kpId of kpIds) {
        await this.processCartoon(kpId, queryRunner);
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

  private async processCartoon(kpId: string, queryRunner: QueryRunner): Promise<void> {
    const [kpMovie, cartoon] = await Promise.all([
      this.kinopoiskService.getMovieById(Number(kpId)),
      this.cartoonRepository.getCartoonByKinopoiskId(kpId, queryRunner),
    ]);

    if (cartoon) {
      this.logger.warn('Cartoon already exist', this.processCartoon.name);

      return;
    }

    if (!kpMovie) {
      this.logger.warn('Cartoon not found in kinopoisk api', this.processCartoon.name);

      return;
    }

    const { name } = kpMovie;

    const cartoonDto: CartonCreateDto = {
      key: null,
      kpId,
      duration: 0,
      name: name || 'unknown',
      originalName: null,
      hidden: true,
      genres: null,
      alternativeName: null,
      universe: null,
      studio: null,
      country: null,
      description: null,
      releaseDate: null,
      handleStatus: MovieHandleStatus.PROCESSING,
      titleUrl: null,
      trailerUrl: null,
      previewUrl: null,
      horizontalPreviewUrl: null,
      backgroundContentUrl: null,
    };

    const newCartoon = this.cartoonEntity.create(cartoonDto);

    await this.cartoonRepository.save(newCartoon, queryRunner);
  }
}
