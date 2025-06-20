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
import { MovieHandleStatus, NewMovieIsHandleNotificationPayloadDto } from '@/movies/domain/types';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MoviesService } from '@/movies/application/movies.service';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { CartonCreateDto } from '@/cartoons/domain/types';

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
    private readonly dateUtil: DateUtil,
    private readonly moviesService: MoviesService,
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

  // TODO: доработать трейлеры и фото
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

    const {
      name: rawName,
      enName,
      alternativeName: rawAlternativeName,
      year,
      countries,
      premiere,
      description,
      genres: rawGenres,
    } = kpMovie;

    let worldReleaseDate: string | null = null;
    if (premiere) {
      const { world } = premiere;
      worldReleaseDate = world || null;
    }

    const name = rawName || rawAlternativeName || enName || null;
    const originalName = enName || rawAlternativeName || null;
    const alternativeName = [rawName, rawAlternativeName, enName, year].filter(Boolean).join(' ');

    const genres = rawGenres
      ? await this.moviesService.getOrCreateGenreFromKinopoisk(rawGenres, queryRunner)
      : null;

    const country = countries?.map(c => c.name) || null;

    const cartoonDto: CartonCreateDto = {
      key: null,
      kpId,
      duration: 0,
      name: name || 'unknown',
      originalName,
      hidden: true,
      genres,
      alternativeName,
      country,
      description: description || null,
      releaseDate: worldReleaseDate ? this.dateUtil.formatDateYyMmDd(worldReleaseDate) : null,
      handleStatus: MovieHandleStatus.PROCESSING,
    };

    const newCartoon = this.cartoonEntity.create(cartoonDto);

    await this.cartoonRepository.save(newCartoon, queryRunner);
  }
}
