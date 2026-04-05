import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { CartonCreateDto, CartonUpdateDto } from '@/cartoons/domain/types';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { MoviesService } from '@/movies/application/movies.service';
import { NewCartoonNotificationPayloadDto } from '@/cartoons/api/dtos/input/new-cartoon-notification.input.dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { TelegramAdminBotSendNotificationNewModerationMovieCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { MovieTypesEnum } from '@/common/types/types';
import { TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand } from '@/telegram/admin-bot/application/handlers/bot-send-notification-movie-downloaded-without-moderation.handler';

export class NewCartoonNotificationCommand implements ICommand {
  constructor(public inputDto: NewCartoonNotificationPayloadDto) {}
}

@CommandHandler(NewCartoonNotificationCommand)
export class NewCartoonNotificationCommandHandler
  implements
    ICommandHandler<
      NewCartoonNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Cartoon.name) private readonly cartoonEntity: typeof Cartoon,
    private readonly cartoonRepository: CartoonRepository,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    @Inject(ModerationCartoonEntity.name)
    private readonly moderationCartoonEntity: typeof ModerationCartoonEntity,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(NewCartoonNotificationCommandHandler.name);
  }

  async execute(
    command: NewCartoonNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpId, key, duration } = inputDto;
    this.logger.log(`New cartoon notification command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const [kpMovie, existingCartoon] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.cartoonRepository.getCartoonByKinopoiskId(kpId, queryRunner),
      ]);

      if (this.moviesService.isFilmInProductionOrModerate(existingCartoon)) {
        this.logger.warn('Cartoon already exist', this.execute.name);

        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ALREADY_EXIST,
          message: 'Cartoon already exist',
          field: 'kpId',
        });
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie, queryRunner);
      const previousHandleStatus = existingCartoon?.handleStatus ?? null;

      const cartoon = existingCartoon
        ? await this.updateExistingCartoon(existingCartoon, metadata, key, duration || 0, kpId)
        : this.createNewCartoon(metadata, key, duration || 0, kpId);

      this.moviesService.setHandleProductionStatus(cartoon);

      const savedCartoon = await this.cartoonRepository.save(cartoon, queryRunner);

      if (!existingCartoon) {
        const { titleUrl, posterUrl, backgroundContentUrl, horizontalPreviewUrl } =
          await this.getContentUrlForNewCartoon(
            savedCartoon.id,
            metadata.trailerUrl,
            metadata.backdropUrl,
            metadata.titleUrl,
            metadata.posterUrl,
          );

        cartoon.updateBackgroundUrl(backgroundContentUrl);
        cartoon.updatePosterUrl(posterUrl);
        cartoon.updateHorizontalPreviewUrl(horizontalPreviewUrl);
        cartoon.updateTitleUrl(titleUrl);

        this.moviesService.setHandleProductionStatus(cartoon);

        await this.cartoonRepository.save(cartoon, queryRunner);
      }

      if (cartoon.handleStatus === MovieHandleStatus.MODERATE) {
        this.logger.log('Cartoon sent to moderation', this.execute.name);

        const moderationResult = await this.movieModeration(cartoon, queryRunner);

        this.publish(moderationResult);
      } else if (
        cartoon.handleStatus === MovieHandleStatus.PRODUCTION &&
        previousHandleStatus !== MovieHandleStatus.PRODUCTION
      ) {
        this.publishWithoutModeration(cartoon.id);
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

  private async updateExistingCartoon(
    cartoon: Cartoon,
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Promise<Cartoon> {
    const { id } = cartoon;
    const backgroundSourceUrl = metadata.backdropUrl || metadata.trailerUrl;
    const [previewUrl, horizontalPreviewUrl, backgroundContentUrl, titleUrl] = await Promise.all([
      !cartoon.previewUrl
        ? this.moviesService.getPosterUrl(metadata.posterUrl, id, MovieTypesEnum.CARTOON)
        : Promise.resolve(null),

      !cartoon.horizontalPreviewUrl
        ? this.moviesService.getBackgroundContentUrl(
            metadata.backdropUrl,
            id,
            MovieTypesEnum.CARTOON,
          )
        : Promise.resolve(null),

      !cartoon.backgroundContentUrl
        ? this.moviesService.getBackgroundContentUrl(
            backgroundSourceUrl,
            id,
            MovieTypesEnum.CARTOON,
          )
        : Promise.resolve(null),

      !cartoon.titleUrl
        ? this.moviesService.getLogoUrl(metadata.titleUrl, id, MovieTypesEnum.CARTOON)
        : Promise.resolve(null),
    ]);

    const cartoonDto: CartonUpdateDto = {
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
      titleUrl: cartoon.titleUrl || titleUrl || null,
      previewUrl: cartoon.previewUrl || previewUrl || null,
      horizontalPreviewUrl: cartoon.horizontalPreviewUrl || horizontalPreviewUrl || null,
      trailerUrl: metadata.trailerUrl,
      backgroundContentUrl: cartoon.backgroundContentUrl || backgroundContentUrl || null,
    };
    cartoon.update(cartoonDto);
    return cartoon;
  }

  private createNewCartoon(
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Cartoon {
    const cartoonDto: CartonCreateDto = {
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
      titleUrl: null,
      previewUrl: null,
      horizontalPreviewUrl: null,
      trailerUrl: metadata.trailerUrl,
      backgroundContentUrl: null,
    };
    return this.cartoonEntity.create(cartoonDto);
  }

  private async movieModeration(cartoon: Cartoon, queryRunner: QueryRunner): Promise<number> {
    const { id } = cartoon;
    const createModerationDto: CreateModerationDto = {
      movieId: id,
    };

    const newModeration =
      this.moderationCartoonEntity.create<ModerationCartoonEntity>(createModerationDto);

    const moderationResult = await this.moderationCartoonRepository.save(
      newModeration,
      queryRunner,
    );

    const { id: moderationId } = moderationResult;

    return moderationId;
  }

  private async getContentUrlForNewCartoon(
    cartoonId: number,
    trailerUrl: string | null,
    backdropUrl: string | null,
    logoUrl: string | null,
    previewUrl: string | null,
  ) {
    const backgroundSourceUrl = backdropUrl || trailerUrl;
    const [backgroundContentUrl, horizontalPreviewUrl, posterUrl, titleUrl] = await Promise.all([
      this.moviesService.getBackgroundContentUrl(
        backgroundSourceUrl,
        cartoonId,
        MovieTypesEnum.CARTOON,
      ),
      this.moviesService.getBackgroundContentUrl(backdropUrl, cartoonId, MovieTypesEnum.CARTOON),
      this.moviesService.getPosterUrl(previewUrl, cartoonId, MovieTypesEnum.CARTOON),
      this.moviesService.getLogoUrl(logoUrl, cartoonId, MovieTypesEnum.CARTOON),
    ]);

    return {
      backgroundContentUrl,
      horizontalPreviewUrl,
      posterUrl,
      titleUrl,
    };
  }

  private publish(moderationId: number): void {
    void this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(
        MovieTypesEnum.CARTOON,
        moderationId,
      ),
    );
  }

  private publishWithoutModeration(movieId: number): void {
    void this.commandBus.execute(
      new TelegramAdminBotSendNotificationMovieDownloadedWithoutModerationCommand(
        MovieTypesEnum.CARTOON,
        movieId,
      ),
    );
  }
}
