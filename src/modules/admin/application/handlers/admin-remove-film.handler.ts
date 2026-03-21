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

  private extractStorageKey(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;

    const value = url.trim();

    if (!value) return null;

    try {
      const parsed = new URL(value);
      const key = parsed.pathname.replace(/^\/+/, '');

      return key || null;
    } catch {
      const key = value
        .replace(/^https?:\/\/[^/]+\//, '')
        .split('?')[0]
        .replace(/^\/+/, '');

      return key || null;
    }
  }

  private async removeMediaByUrls(
    urls: Array<string | null | undefined>,
    scope: string,
  ): Promise<void> {
    const keys = Array.from(
      new Set(urls.map(url => this.extractStorageKey(url)).filter((key): key is string => !!key)),
    );

    for (const key of keys) {
      await this.rmqResultHandlerUtil.getRmqData(
        () => this.downloaderServiceAdapter.removeMovie(key),
        scope,
      );
    }
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

      await this.removeMediaByUrls(
        [film.videoUrl, film.previewUrl, film.backgroundContentUrl, film.titleUrl],
        'Remove film media',
      );

      await this.filmRepository.remove(film);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
