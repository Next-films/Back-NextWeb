import { Injectable } from '@nestjs/common';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { DownloaderServiceRestAdapter } from '@/common/infrastructure/rest/downloader-service.rest.adapter';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ImgExtEnum, MovieTypesEnum, TorApiMovieById, TorApiProvidersEnum } from '@/common/types/types';

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

  private getBridgeAdapter(): DownloaderServiceAdapter | DownloaderServiceRestAdapter {
    if (this.modeService.isRmqMode()) {
      if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
      return this.rmqAdapter;
    }

    return this.restAdapter;
  }

  private getActiveAdapter(): DownloaderServiceAdapter | DownloaderServiceRestAdapter {
    return this.getBridgeAdapter();
  }

  bridgeFindFilms(): Promise<void> {
    return this.getBridgeAdapter().bridgeFindFilms();
  }

  bridgeDownloadFilms(): Promise<void> {
    return this.getBridgeAdapter().bridgeDownloadFilms();
  }

  bridgeFindCartoons(): Promise<void> {
    return this.getBridgeAdapter().bridgeFindCartoons();
  }

  bridgeDownloadCartoons(): Promise<void> {
    return this.getBridgeAdapter().bridgeDownloadCartoons();
  }

  bridgeFindSerials(): Promise<void> {
    return this.getBridgeAdapter().bridgeFindSerials();
  }

  bridgeDownloadSerials(): Promise<void> {
    return this.getBridgeAdapter().bridgeDownloadSerials();
  }

  clearLogs(keys: string[]): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().clearLogs(keys);
  }

  removeMovie(key: string): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().removeMovie(key);
  }

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().addMovieToQueue(torrent, provider, type);
  }

  downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string | null, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().downloadPreviewClip(movieId, file, type);
  }

  uploadFilm(
    movieId: number,
    file: Express.Multer.File,
    type: MovieTypesEnum,
  ): AppNotificationResult<null, ErrorFieldExceptionDto | null> {
    return this.getActiveAdapter().uploadFilm(movieId, file, type);
  }

  resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().resizeAndSavePoster(movieId, file, type);
  }

  resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().resizeAndSaveLogo(movieId, file, type);
  }

  adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    return this.getActiveAdapter().adminUploadAvatar(file, extension, adminId, currentAvatarPath);
  }
}
