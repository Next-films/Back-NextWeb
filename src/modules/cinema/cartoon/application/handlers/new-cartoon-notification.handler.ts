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

      const cartoon = existingCartoon
        ? this.updateExistingCartoon(existingCartoon, metadata, key, duration || 0, kpId)
        : this.createNewCartoon(metadata, key, duration || 0, kpId);

      this.moviesService.setHandleProductionStatus(cartoon);

      await this.cartoonRepository.save(cartoon, queryRunner);

      if (cartoon.handleStatus === MovieHandleStatus.MODERATE) {
        this.logger.log('Cartoon sent to moderation', this.execute.name);

        const moderationResult = await this.movieModeration(cartoon, queryRunner);

        this.publish(moderationResult);
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

  private updateExistingCartoon(
    cartoon: Cartoon,
    metadata: MovieKpMetadata,
    key: string,
    duration: number,
    kpId: string,
  ): Cartoon {
    // TODO: Трейлеры и тд
    const cartoonDto: CartonUpdateDto = {
      videUrl: key,
      kpId,
      duration: duration || 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      titleUrl: metadata.titleUrl, // TODO: Проверка что это PNG файл + сделать резайс через sharp и сохранить в хранилище
      previewUrl: metadata.posterUrl, // TODO: сделать резайс через sharp и сохранить в хранилище
      trailerUrl: metadata.trailerUrl,
      backgroundContentUrl: metadata.trailerUrl, // TODO: отрезать 10-15 секунд от трейлера и сохрнаить в хранилище
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
    // TODO: Трейлеры и тд
    const cartoonDto: CartonCreateDto = {
      key,
      kpId,
      duration: duration || 0,
      name: metadata.name || 'unknown',
      originalName: metadata.originalName,
      hidden: false,
      genres: metadata.genres,
      alternativeName: metadata.alternativeName,
      country: metadata.countries,
      description: metadata.description,
      releaseDate: metadata.releaseDate,
      handleStatus: MovieHandleStatus.PROCESSING,
      titleUrl: metadata.titleUrl, // TODO: Проверка что это PNG файл + сделать резайс через sharp и сохранить в хранилище
      previewUrl: metadata.posterUrl, // TODO: сделать резайс через sharp и сохранить в хранилище
      trailerUrl: metadata.trailerUrl,
      backgroundContentUrl: metadata.trailerUrl, // TODO: отрезать 10-15 секунд от трейлера и сохрнаить в хранилище
    };
    return this.cartoonEntity.create(cartoonDto);
  }

  private async movieModeration(film: Cartoon, queryRunner: QueryRunner): Promise<number> {
    const { id } = film;
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

  private publish(moderationId: number): void {
    this.commandBus.execute(
      new TelegramAdminBotSendNotificationNewModerationMovieCommand(
        MovieTypesEnum.CARTOON,
        moderationId,
      ),
    );
  }
}
