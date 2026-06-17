import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationSerialRepository } from '@/moderation-movie/infrastructure/moderation-serial.repository';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';

export class AdminRemoveSerialCommand implements ICommand {
  constructor(public serialId: number) {}
}

@CommandHandler(AdminRemoveSerialCommand)
export class AdminRemoveSerialCommandHandler
  implements
    ICommandHandler<
      AdminRemoveSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly serialRepository: SerialRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
    private readonly moderationSerialRepository: ModerationSerialRepository,
    private readonly finishedTorrentModerationRepository: FinishedTorrentModerationRepository,
  ) {
    this.logger.setContext(AdminRemoveSerialCommandHandler.name);
  }

  // Best-effort purge of residual data tied to a removed serial (download queue, pending
  // moderation task, finished-torrent marker) so it cannot be resurrected or leave orphans.
  private async cleanupResiduals(movieId: number, kpId: string | null): Promise<void> {
    try {
      if (kpId) {
        await this.downloaderServiceAdapter.bridgeRemoveFromQueueByKpId(
          MovieTypesEnum.SERIAL,
          kpId,
        );
        await this.finishedTorrentModerationRepository.deleteByKpId(kpId);
      }
      await this.moderationSerialRepository.deleteByMovieId(movieId);
    } catch (error) {
      this.logger.error(error, this.cleanupResiduals.name);
    }
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
    command: AdminRemoveSerialCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Remove serial by admin command`, this.execute.name);
    const { serialId } = command;
    try {
      const serial = await this.serialRepository.getSerialById(serialId);

      if (!serial)
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      const episodeUrls = (serial.episodes || []).flatMap(episode => [
        episode.videoUrl,
        episode.previewUrl,
      ]);
      await this.removeMediaByUrls(
        [
          serial.videoUrl,
          serial.previewUrl,
          serial.horizontalPreviewUrl,
          serial.backgroundContentUrl,
          serial.titleUrl,
          ...episodeUrls,
        ],
        'Remove serial media',
      );

      await this.serialRepository.remove(serial);
      await this.cleanupResiduals(serial.id, serial.kpId ?? null);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}
