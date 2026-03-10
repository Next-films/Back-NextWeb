import { Injectable } from '@nestjs/common';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { DownloaderServiceRestAdapter } from '@/common/infrastructure/rest/downloader-service.rest.adapter';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  ImgExtEnum,
  MovieTypesEnum,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';

@Injectable()
export class DownloaderServiceSwitchAdapter {
  constructor(
    private readonly rmqAdapter: DownloaderServiceAdapter | null,
    private readonly restAdapter: DownloaderServiceRestAdapter,
    private readonly modeService: DownloaderTransportModeService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DownloaderServiceSwitchAdapter.name);
  }

  private async executeBridgeWithFallback(
    actionName: string,
    rmqAction: () => Promise<void>,
    httpAction: () => Promise<void>,
  ): Promise<void> {
    if (!this.modeService.isRmqMode()) {
      await httpAction();
      return;
    }

    try {
      await rmqAction();
      this.modeService.markRmqSuccess();
    } catch (error) {
      this.logger.warn(
        `RMQ bridge action failed (${actionName}). Auto fallback to HTTP transport.`,
        this.executeBridgeWithFallback.name,
      );
      this.logger.error(error, this.executeBridgeWithFallback.name);
      this.modeService.markRmqFailureAndFallbackToHttp();
      await httpAction();
    }
  }

  private async executeRequestWithFallback<T>(
    actionName: string,
    rmqAction: () => Promise<AppNotificationResult<T, ErrorFieldExceptionDto | null>>,
    httpAction: () => Promise<AppNotificationResult<T, ErrorFieldExceptionDto | null>>,
  ): Promise<AppNotificationResult<T, ErrorFieldExceptionDto | null>> {
    if (!this.modeService.isRmqMode()) {
      return httpAction();
    }

    try {
      const rmqResult = await rmqAction();

      if (rmqResult.appResult === AppNotificationResultEnum.InternalError) {
        this.logger.warn(
          `RMQ request action returned InternalError (${actionName}). Auto fallback to HTTP transport.`,
          this.executeRequestWithFallback.name,
        );
        this.modeService.markRmqFailureAndFallbackToHttp();
        return httpAction();
      }

      this.modeService.markRmqSuccess();
      return rmqResult;
    } catch (error) {
      this.logger.warn(
        `RMQ request action failed (${actionName}). Auto fallback to HTTP transport.`,
        this.executeRequestWithFallback.name,
      );
      this.logger.error(error, this.executeRequestWithFallback.name);
      this.modeService.markRmqFailureAndFallbackToHttp();
      return httpAction();
    }
  }

  bridgeFindFilms(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeFindFilms.name,
      () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.bridgeFindFilms();
      },
      () => this.restAdapter.bridgeFindFilms(),
    );
  }

  bridgeDownloadFilms(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeDownloadFilms.name,
      () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.bridgeDownloadFilms();
      },
      () => this.restAdapter.bridgeDownloadFilms(),
    );
  }

  bridgeFindCartoons(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeFindCartoons.name,
      () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.bridgeFindCartoons();
      },
      () => this.restAdapter.bridgeFindCartoons(),
    );
  }

  bridgeDownloadCartoons(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeDownloadCartoons.name,
      () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.bridgeDownloadCartoons();
      },
      () => this.restAdapter.bridgeDownloadCartoons(),
    );
  }

  bridgeFindSerials(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeFindSerials.name,
      () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.bridgeFindSerials();
      },
      () => this.restAdapter.bridgeFindSerials(),
    );
  }

  bridgeDownloadSerials(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeDownloadSerials.name,
      () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.bridgeDownloadSerials();
      },
      () => this.restAdapter.bridgeDownloadSerials(),
    );
  }

  clearLogs(keys: string[]): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.clearLogs.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.clearLogs(keys);
      },
      () => this.restAdapter.clearLogs(keys),
    );
  }

  removeMovie(key: string): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.removeMovie.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.removeMovie(key);
      },
      () => this.restAdapter.removeMovie(key),
    );
  }

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.addMovieToQueue.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.addMovieToQueue(torrent, provider, type);
      },
      () => this.restAdapter.addMovieToQueue(torrent, provider, type),
    );
  }

  downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string | null, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.downloadPreviewClip.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.downloadPreviewClip(movieId, file, type);
      },
      () => this.restAdapter.downloadPreviewClip(movieId, file, type),
    );
  }

  uploadFilm(
    movieId: number,
    file: Express.Multer.File,
    type: MovieTypesEnum,
  ): AppNotificationResult<null, ErrorFieldExceptionDto | null> {
    if (!this.modeService.isRmqMode()) {
      return this.restAdapter.uploadFilm(movieId, file, type);
    }

    try {
      if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
      const rmqResult = this.rmqAdapter.uploadFilm(movieId, file, type);

      if (rmqResult.appResult === AppNotificationResultEnum.InternalError) {
        this.logger.warn(
          `RMQ request action returned InternalError (${this.uploadFilm.name}). Auto fallback to HTTP transport.`,
          this.uploadFilm.name,
        );
        this.modeService.markRmqFailureAndFallbackToHttp();
        return this.restAdapter.uploadFilm(movieId, file, type);
      }

      this.modeService.markRmqSuccess();
      return rmqResult;
    } catch (error) {
      this.logger.warn(
        `RMQ request action failed (${this.uploadFilm.name}). Auto fallback to HTTP transport.`,
        this.uploadFilm.name,
      );
      this.logger.error(error, this.uploadFilm.name);
      this.modeService.markRmqFailureAndFallbackToHttp();
      return this.restAdapter.uploadFilm(movieId, file, type);
    }
  }

  resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.resizeAndSavePoster.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.resizeAndSavePoster(movieId, file, type);
      },
      () => this.restAdapter.resizeAndSavePoster(movieId, file, type),
    );
  }

  resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.resizeAndSaveLogo.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.resizeAndSaveLogo(movieId, file, type);
      },
      () => this.restAdapter.resizeAndSaveLogo(movieId, file, type),
    );
  }

  adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    return this.executeRequestWithFallback(
      this.adminUploadAvatar.name,
      async () => {
        if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
        return this.rmqAdapter.adminUploadAvatar(file, extension, adminId, currentAvatarPath);
      },
      () => this.restAdapter.adminUploadAvatar(file, extension, adminId, currentAvatarPath),
    );
  }
}
