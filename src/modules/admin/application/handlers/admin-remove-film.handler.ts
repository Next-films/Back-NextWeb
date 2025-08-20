import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';

export class AdminRemoveFilmCommand implements ICommand {
  constructor(public filmId: number) {}
}

@CommandHandler(AdminRemoveFilmCommand)
export class AdminRemoveFilmCommandHandler
  implements
    ICommandHandler<
      AdminRemoveFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly filmRepository: FilmRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
  ) {
    this.logger.setContext(AdminRemoveFilmCommandHandler.name);
  }
  async execute(
    command: AdminRemoveFilmCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Remove film by admin command`, this.execute.name);
    const { filmId } = command;
    try {
      const film = await this.filmRepository.getFilmById(filmId);

      if (!film)
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const { videoUrl } = film;

      if (videoUrl) {
        const key = videoUrl.replace(/^https?:\/\/[^/]+\//, '');
        await this.rmqResultHandlerUtil.getRmqData(
          () => this.downloaderServiceAdapter.removeMovie(key),
          'Remove film',
        );
      }

      await this.filmRepository.remove(film);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
