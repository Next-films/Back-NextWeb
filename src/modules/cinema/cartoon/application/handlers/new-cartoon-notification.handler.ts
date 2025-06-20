import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { CartonCreateDto, NewCartoonNotificationPayloadDto } from '@/cartoons/domain/types';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { DateUtil } from '@/common/utils/date.util';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieHandleStatus } from '@/movies/domain/types';
import { MoviesService } from '@/movies/application/movies.service';

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
    private readonly dateUtil: DateUtil,
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
      const [kpMovie, cartoon] = await Promise.all([
        this.kinopoiskService.getMovieById(Number(kpId)),
        this.cartoonRepository.getCartoonByKinopoiskId(kpId),
      ]);

      // TODO: доработать трейлеры и фото
      // TODO: отправка нотификации админу что нужно проверить фильм, фильм. Подумать как обработать
      if (!kpMovie) {
        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.KP_MOVIE_NOT_FOUND,
          message: 'Movie not found',
          field: 'kpId',
        });
      }

      // TODO: отправка нотификации админу что нужно проверить фильм. Подумать как обработать (вернуть в очередь или создать фильм но с hidden)
      if (
        (cartoon && cartoon.handleStatus === MovieHandleStatus.PRODUCTION) ||
        (cartoon && cartoon.handleStatus === MovieHandleStatus.MODERATE)
      ) {
        this.logger.warn('Cartoon already exist', this.execute.name);

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ALREADY_EXIST,
          message: 'Cartoon already exist',
          field: 'kpId',
        });
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
        ? await this.moviesService.getOrCreateGenreFromKinopoisk(rawGenres)
        : null;

      const country = countries?.map(c => c.name) || null;

      const hidden =
        !name ||
        !worldReleaseDate ||
        !description ||
        !genres ||
        !duration ||
        duration === 0 ||
        !country ||
        country.length === 0;

      const cartonDto: CartonCreateDto = {
        key,
        kpId,
        duration: duration || 0,
        name: name || 'unknown',
        originalName,
        hidden,
        genres,
        alternativeName,
        country,
        description: description || null,
        releaseDate: worldReleaseDate ? this.dateUtil.formatDateYyMmDd(worldReleaseDate) : null,
        handleStatus: MovieHandleStatus.PROCESSING,
      };

      let handledCartoon: Cartoon | null = null;

      if (cartoon) {
        handledCartoon = this.handleExistCartoon(cartoon, cartonDto);
      } else {
        handledCartoon = this.handleNewCartoon(cartonDto);
      }

      if (!handledCartoon) {
        this.logger.error(
          'Something went wrong. There is no movie being processed.',
          this.execute.name,
        );

        return this.appNotification.internalServerError();
      }

      if (!hidden) {
        handledCartoon.updateHandleStatus(MovieHandleStatus.PRODUCTION);
      } else {
        handledCartoon.updateHandleStatus(MovieHandleStatus.MODERATE);
      }

      await this.cartoonRepository.save(handledCartoon);

      if (hidden) {
        this.logger.log('Moderate cartoon', this.execute.name);
        // TODO: moderate
      }
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private handleExistCartoon(cartoon: Cartoon, cartoonDto: CartonCreateDto): Cartoon {
    cartoon.update(cartoonDto);
    return cartoon;
  }

  private handleNewCartoon(cartoonDto: CartonCreateDto): Cartoon {
    return this.cartoonEntity.create(cartoonDto);
  }
}
