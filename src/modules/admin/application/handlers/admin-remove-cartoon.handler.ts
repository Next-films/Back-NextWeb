import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { buildMovieStorageKeys } from '@/admin/application/utils/movie-storage-keys.util';

export class AdminRemoveCartoonCommand implements ICommand {
  constructor(public cartoonId: number) {}
}

@CommandHandler(AdminRemoveCartoonCommand)
export class AdminRemoveCartoonCommandHandler
  implements
    ICommandHandler<
      AdminRemoveCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly cartoonRepository: CartoonRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
    private readonly moderationCartoonRepository: ModerationCartoonRepository,
    private readonly finishedTorrentModerationRepository: FinishedTorrentModerationRepository,
  ) {
    this.logger.setContext(AdminRemoveCartoonCommandHandler.name);
  }

  // Best-effort purge of residual data tied to a removed cartoon (download queue, pending
  // moderation task, finished-torrent marker) so it cannot be resurrected or leave orphans.
  private async cleanupResiduals(movieId: number, kpId: string | null): Promise<void> {
    try {
      if (kpId) {
        await this.downloaderServiceAdapter.bridgeRemoveFromQueueByKpId(
          MovieTypesEnum.CARTOON,
          kpId,
        );
        await this.finishedTorrentModerationRepository.deleteByKpId(kpId);
      }
      await this.moderationCartoonRepository.deleteByMovieId(movieId);
    } catch (error) {
      this.logger.error(error, this.cleanupResiduals.name);
    }
  }

  private async removeMediaByUrls(
    movieId: number,
    urls: Array<string | null | undefined>,
    scope: string,
  ): Promise<void> {
    const keys = buildMovieStorageKeys(MovieTypesEnum.CARTOON, movieId, urls);

    for (const key of keys) {
      await this.rmqResultHandlerUtil.getRmqData(
        () => this.downloaderServiceAdapter.removeMovie(key),
        scope,
      );
    }
  }

  async execute(
    command: AdminRemoveCartoonCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Remove cartoon by admin command`, this.execute.name);
    const { cartoonId } = command;
    try {
      const cartoon = await this.cartoonRepository.getCartoonById(cartoonId);

      if (!cartoon)
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      await this.removeMediaByUrls(
        cartoon.id,
        [
          cartoon.videoUrl,
          cartoon.trailerUrl,
          cartoon.previewUrl,
          cartoon.horizontalPreviewUrl,
          cartoon.backgroundContentUrl,
          cartoon.titleUrl,
        ],
        'Remove cartoon media',
      );

      await this.cartoonRepository.remove(cartoon);
      await this.cleanupResiduals(cartoon.id, cartoon.kpId ?? null);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
