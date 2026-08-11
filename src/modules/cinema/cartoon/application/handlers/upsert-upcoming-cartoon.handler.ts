import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
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

export class UpsertUpcomingCartoonCommand implements ICommand {
  constructor(public inputDto: UpsertUpcomingMoviePayloadDto) {}
}

@CommandHandler(UpsertUpcomingCartoonCommand)
export class UpsertUpcomingCartoonCommandHandler
  implements
    ICommandHandler<
      UpsertUpcomingCartoonCommand,
      AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Cartoon.name) private readonly cartoonEntity: typeof Cartoon,
    private readonly cartoonRepository: CartoonRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly movieMetadataCardService: MovieMetadataCardService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(UpsertUpcomingCartoonCommandHandler.name);
  }

  async execute(
    command: UpsertUpcomingCartoonCommand,
  ): Promise<AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = command.inputDto;
    this.logger.log(`Upsert upcoming cartoon card command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [kpMovie, existingCartoon] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.cartoonRepository.getCartoonByKinopoiskId(kpId, queryRunner),
      ]);

      if (!kpMovie) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Cartoon not found in kinopoisk',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });
      }

      if (existingCartoon?.videoUrl) {
        await queryRunner.commitTransaction();
        return this.appNotification.success(new UpsertUpcomingMovieOutputDto(true));
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);
      if (!this.movieMetadataCardService.shouldPublishUpcomingCard(metadata)) {
        await queryRunner.commitTransaction();
        return this.appNotification.success(new UpsertUpcomingMovieOutputDto(true));
      }

      const cartoon = existingCartoon
        ? this.movieMetadataCardService.updateExistingMovie(existingCartoon, metadata, kpId)
        : this.cartoonEntity.create(this.movieMetadataCardService.createMovieDto(metadata, kpId));

      const savedCartoon = await this.cartoonRepository.save(cartoon, queryRunner);

      await this.movieMetadataCardService.hydrateNewMovieAssets(
        savedCartoon,
        metadata,
        MovieTypesEnum.CARTOON,
      );
      await this.cartoonRepository.save(savedCartoon, queryRunner);

      await queryRunner.commitTransaction();
      return this.appNotification.success(
        new UpsertUpcomingMovieOutputDto(
          savedCartoon.handleStatus === MovieHandleStatus.PRODUCTION,
        ),
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
