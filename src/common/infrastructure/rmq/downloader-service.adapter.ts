import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ADD_MOVIE_TO_DOWNLOAD_QUEUE_CMD,
  ADMIN_UPLOAD_AVATAR_CMD,
  BRIDGE_DOWNLOAD_CARTOONS_CMD,
  BRIDGE_DOWNLOAD_FILMS_CMD,
  BRIDGE_DOWNLOAD_SERIALS_CMD,
  BRIDGE_FIND_CARTOONS_CMD,
  BRIDGE_FIND_FILMS_CMD,
  BRIDGE_FIND_SERIALS_CMD,
  CLEAR_LOGS_CMD,
  DOWNLOAD_SERVICE_RMQ_NAME,
  DOWNLOAD_YT_CLIP_CMD,
  REMOVE_MOVIE_CMD,
  RESIZE_SAVE_LOGO_CMD,
  RESIZE_SAVE_POSTER_CMD,
} from '@/common/constants/rmq.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { RmqAuthPayload } from '@/common/infrastructure/rmq/types';
import { ClearConverterLogsPayloadDto } from '@/converter-logs/domain/types';
import { AddMovieToDownloadQueuePayloadDto, RemoveMoviePayloadDto } from '@/admin/domain/types';
import {
  AdminUploadAvatarPayloadDto,
  DownloadPreviewYtClipPayloadDto,
  IDownloaderServiceAdapter,
  ImgExtEnum,
  MovieTypesEnum,
  ResizeAndSafeLogoPayloadDto,
  ResizeAndSafePosterPayloadDto,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';

@Injectable()
export class DownloaderServiceAdapter implements IDownloaderServiceAdapter {
  private readonly auth_token: string;

  constructor(
    private logger: LoggerService,
    private appNotification: ApplicationNotification,
    @Inject(DOWNLOAD_SERVICE_RMQ_NAME) private readonly client: ClientProxy,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(DownloaderServiceAdapter.name);
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.auth_token = apiSettings.DOWNLOAD_SERVICE_TOKEN;
  }

  /*
   *
   *  Bridges to download service
   *
   */
  bridgeFindFilms(): void {
    this.client.emit({ cmd: BRIDGE_FIND_FILMS_CMD }, {});
  }

  bridgeDownloadFilms(): void {
    this.client.emit({ cmd: BRIDGE_DOWNLOAD_FILMS_CMD }, {});
  }

  bridgeFindCartoons(): void {
    this.client.emit({ cmd: BRIDGE_FIND_CARTOONS_CMD }, {});
  }

  bridgeDownloadCartoons(): void {
    this.client.emit({ cmd: BRIDGE_DOWNLOAD_CARTOONS_CMD }, {});
  }

  bridgeFindSerials(): void {
    this.client.emit({ cmd: BRIDGE_FIND_SERIALS_CMD }, {});
  }

  bridgeDownloadSerials(): void {
    this.client.emit({ cmd: BRIDGE_DOWNLOAD_SERIALS_CMD }, {});
  }
  /*
   *
   *  Logs
   *
   */
  async clearLogs(
    keys: string[],
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<ClearConverterLogsPayloadDto> = {
        payload: {
          keys,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<null, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: CLEAR_LOGS_CMD }, payload).pipe(timeout(50_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.clearLogs.name);

      return this.appNotification.internalServerError();
    }
  }
  /*
   *
   *  Remove movies
   *
   */
  async removeMovie(
    key: string,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<RemoveMoviePayloadDto> = {
        payload: {
          key,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<null, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: REMOVE_MOVIE_CMD }, payload).pipe(timeout(50_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.removeMovie.name);

      return this.appNotification.internalServerError();
    }
  }

  /*
   *
   *  Add to queue
   *
   */
  async addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<AddMovieToDownloadQueuePayloadDto> = {
        payload: {
          torrent,
          provider,
          type,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<null, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: ADD_MOVIE_TO_DOWNLOAD_QUEUE_CMD }, payload).pipe(timeout(20_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.addMovieToQueue.name);

      return this.appNotification.internalServerError();
    }
  }

  /*
   *
   *  Send request to download preview yt clip
   *
   */
  async downloadPreviewClip(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<DownloadPreviewYtClipPayloadDto> = {
        payload: {
          kpId,
          url,
          type,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<string, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: DOWNLOAD_YT_CLIP_CMD }, payload).pipe(timeout(60_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.downloadPreviewClip.name);

      return this.appNotification.internalServerError();
    }
  }

  /*
   *
   *  Resize poster, logo and save
   *
   */
  async resizeAndSavePoster(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<ResizeAndSafePosterPayloadDto> = {
        payload: {
          kpId,
          url,
          type,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<string, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: RESIZE_SAVE_POSTER_CMD }, payload).pipe(timeout(60_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.resizeAndSavePoster.name);

      return this.appNotification.internalServerError();
    }
  }

  async resizeAndSaveLogo(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<ResizeAndSafeLogoPayloadDto> = {
        payload: {
          kpId,
          url,
          type,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<string, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: RESIZE_SAVE_LOGO_CMD }, payload).pipe(timeout(60_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.resizeAndSavePoster.name);

      return this.appNotification.internalServerError();
    }
  }

  /*
   *
   *  Upload avatars
   *
   */
  async adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      const payload: RmqAuthPayload<AdminUploadAvatarPayloadDto> = {
        payload: {
          file,
          extension,
          adminId,
          currentAvatarPath,
        },
        token: this.auth_token,
      };

      const response: Observable<AppNotificationResult<string, ErrorFieldExceptionDto | null>> =
        this.client.send({ cmd: ADMIN_UPLOAD_AVATAR_CMD }, payload).pipe(timeout(60_000));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, this.adminUploadAvatar.name);

      return this.appNotification.internalServerError();
    }
  }
}

@Injectable()
export class DownloaderServiceAdapterMock implements IDownloaderServiceAdapter {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(DownloaderServiceAdapterMock.name);
  }

  /*
   *
   *  Bridges to download service
   *
   */
  bridgeFindFilms(): void {
    this.logger.log('Execute: start find films process. (mock)', this.bridgeFindFilms.name);
  }

  bridgeDownloadFilms(): void {
    this.logger.log('Execute: start download films process. (mock)', this.bridgeDownloadFilms.name);
  }

  bridgeFindCartoons(): void {
    this.logger.log('Execute: start find cartoons process. (mock)', this.bridgeFindCartoons.name);
  }

  bridgeDownloadCartoons(): void {
    this.logger.log(
      'Execute: start download cartoons process. (mock)',
      this.bridgeDownloadCartoons.name,
    );
  }

  bridgeFindSerials(): void {
    this.logger.log('Execute: start find serials process. (mock)', this.bridgeFindSerials.name);
  }

  bridgeDownloadSerials(): void {
    this.logger.log(
      'Execute: start download serials process. (mock)',
      this.bridgeDownloadSerials.name,
    );
  }
  /*
   *
   *  Logs
   *
   */
  async clearLogs(
    keys: string[],
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(
      `Execute: clear converter logs (mock). Keys: ${JSON.stringify(keys)}`,
      this.clearLogs.name,
    );
    await new Promise(resolve => resolve(null));
    return this.appNotification.success(null);
  }
  /*
   *
   *  Remove movies
   *
   */
  async removeMovie(
    key: string,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: remove movie (mock). Key: ${key}`, this.removeMovie.name);
    await new Promise(resolve => resolve(null));
    return this.appNotification.success(null);
  }
  /*
   *
   *  Add to queue
   *
   */
  async addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(
      `Execute: add movie to queue (mock). Provider: ${provider}, type: ${type}, torrent: ${JSON.stringify(
        torrent,
      )}`,
      this.addMovieToQueue.name,
    );
    await new Promise(resolve => resolve(null));
    return this.appNotification.success(null);
  }

  /*
   *
   *  Send request to download preview yt clip
   *
   */
  async downloadPreviewClip(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    this.logger.log(
      `Execute: download yt clip (mock). Kp id: ${kpId}, type: ${type}, url: ${url}`,
      this.downloadPreviewClip.name,
    );
    await new Promise(resolve => resolve(null));
    return this.appNotification.success('mock');
  }

  /*
   *
   *  Resize poster, logo and save
   *
   */
  async resizeAndSavePoster(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    this.logger.log(
      `Execute: resize and save poster (mock). Kp id: ${kpId}, type: ${type}, url: ${url}`,
      this.resizeAndSavePoster.name,
    );
    await new Promise(resolve => resolve(null));
    return this.appNotification.success('mock');
  }

  async resizeAndSaveLogo(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    this.logger.log(
      `Execute: resize and save logo (mock). Kp id: ${kpId}, type: ${type}, url: ${url}`,
      this.resizeAndSaveLogo.name,
    );
    await new Promise(resolve => resolve(null));
    return this.appNotification.success('mock');
  }
  /*
   *
   *  Upload avatars
   *
   */
  async adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    this.logger.log(
      `Execute: upload avatar (mock). Ext: ${extension}, admin id: ${adminId}, current avatar: ${currentAvatarPath}`,
      this.adminUploadAvatar.name,
    );
    await new Promise(resolve => resolve(null));
    return this.appNotification.success(
      'https://www.shutterstock.com/image-vector/young-smiling-man-avatar-3d-600nw-2124054758.jpg',
    );
  }
}
