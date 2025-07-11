import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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
  ) {
    this.logger.setContext(NewCartoonNotificationCommandHandler.name);
  }

  async execute(
    command: NewCartoonNotificationCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { kpId, key, duration } = inputDto;
    this.logger.log(`New cartoon notification command`, this.execute.name);
    try {
      const [kpMovie, existingCartoon] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.cartoonRepository.getCartoonByKinopoiskId(kpId),
      ]);

      // TODO: доработать трейлеры и фото
      // TODO: отправка нотификации админу что нужно проверить фильм. Подумать как обработать (вернуть в очередь или создать фильм но с hidden)
      if (this.moviesService.isFilmInProductionOrModerate(existingCartoon)) {
        this.logger.warn('Cartoon already exist', this.execute.name);

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ALREADY_EXIST,
          message: 'Cartoon already exist',
          field: 'kpId',
        });
      }

      const metadata = await this.moviesService.extractMovieMetadata(kpMovie);

      const cartoon = existingCartoon
        ? this.updateExistingCartoon(existingCartoon, metadata, key, duration || 0, kpId)
        : this.createNewCartoon(metadata, key, duration || 0, kpId);

      this.moviesService.setHandleProductionStatus(cartoon);

      await this.cartoonRepository.save(cartoon);

      if (cartoon.handleStatus === MovieHandleStatus.MODERATE) {
        this.logger.log('Cartoon sent to moderation', this.execute.name);
        // TODO: moderate
      }
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
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
      titleUrl: null,
      previewUrl: null,
      trailerUrl: null,
      backgroundContentUrl: null,
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
    };
    return this.cartoonEntity.create(cartoonDto);
  }
}
