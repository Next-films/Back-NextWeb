import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ClearConverterLogsPayloadDto } from '@/converter-logs/domain/types';
import { AddMovieToDownloadQueuePayloadDto, RemoveMoviePayloadDto } from '@/admin/domain/types';
import {
  DownloadPreviewYtClipPayloadDto,
  IDownloaderServiceAdapter,
  ImgExtEnum,
  MovieTypesEnum,
  ResizeAndSafeLogoPayloadDto,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';
import { HttpService } from '@nestjs/axios';
import {
  DOWNLOADER_HTTP_SERVICE,
  DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS,
  DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS,
  DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS,
  DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS,
  DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS,
} from '@/common/constants/downloader-service.rest.constants';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import * as path from 'path';

@Injectable()
export class DownloaderServiceRestAdapter implements IDownloaderServiceAdapter {
  private readonly baseAuthHeaders: AxiosRequestConfig;
  constructor(
    private logger: LoggerService,
    private appNotification: ApplicationNotification,
    private readonly configService: ConfigService<ConfigurationType, true>,
    @Inject(DOWNLOADER_HTTP_SERVICE) private readonly httpService: HttpService,
  ) {
    this.logger.setContext(DownloaderServiceRestAdapter.name);
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.baseAuthHeaders = {
      headers: {
        Authorization: `Bearer ${apiSettings.DOWNLOAD_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
  }
  private handleError<T = null, D = null>(error: any, scope?: string): AppNotificationResult<T, D> {
    const data: AppNotificationResult<T, D> = error?.response?.data;

    if (error?.response?.data?.appResult) {
      return data;
    }

    this.logger.error(error, scope ? scope : this.handleError.name);
    return this.appNotification.internalServerError();
  }

  /*
   *
   *  Bridges to download service
   *
   */
  async bridgeFindFilms(): Promise<void> {
    try {
      await this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FILMS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FIND}`,
        {},
        this.baseAuthHeaders,
      );
    } catch (e) {
      this.logger.error(e, this.bridgeFindFilms.name);
    }
  }

  async bridgeDownloadFilms(): Promise<void> {
    try {
      await this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FILMS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.DOWNLOAD}`,
        {},
        this.baseAuthHeaders,
      );
    } catch (e) {
      this.logger.error(e, this.bridgeFindFilms.name);
    }
  }

  async bridgeFindCartoons(): Promise<void> {
    try {
      await this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.CARTOONS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FIND}`,
        {},
        this.baseAuthHeaders,
      );
    } catch (e) {
      this.logger.error(e, this.bridgeFindCartoons.name);
    }
  }

  async bridgeDownloadCartoons(): Promise<void> {
    try {
      await this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.CARTOONS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.DOWNLOAD}`,
        {},
        this.baseAuthHeaders,
      );
    } catch (e) {
      this.logger.error(e, this.bridgeDownloadCartoons.name);
    }
  }

  async bridgeFindSerials(): Promise<void> {
    try {
      await this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.SERIALS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FIND}`,
        {},
        this.baseAuthHeaders,
      );
    } catch (e) {
      this.logger.error(e, this.bridgeFindSerials.name);
    }
  }

  async bridgeDownloadSerials(): Promise<void> {
    try {
      await this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.SERIALS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.DOWNLOAD}`,
        {},
        this.baseAuthHeaders,
      );
    } catch (e) {
      this.logger.error(e, this.bridgeDownloadSerials.name);
    }
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
      const payload: ClearConverterLogsPayloadDto = {
        keys,
      };

      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<null, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.LOGS}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.CLEAR}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.clearLogs.name);
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
      const payload: RemoveMoviePayloadDto = {
        key,
      };
      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<null, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS.REMOVE}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.removeMovie.name);
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
      const payload: AddMovieToDownloadQueuePayloadDto = {
        torrent,
        provider,
        type,
      };

      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<null, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS.ADD_TO_QUEUE}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.addMovieToQueue.name);
    }
  }

  /*
   *
   *  Send request to download preview yt clip
   *
   */
  async downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      let result: AxiosResponse<
        AppNotificationResult<string, ErrorFieldExceptionDto | null>
      > | null = null;

      if (typeof file === 'string') {
        const payload: DownloadPreviewYtClipPayloadDto = {
          movieId,
          url: file,
          type,
        };

        result = await this.httpService.axiosRef.post<
          AppNotificationResult<string, ErrorFieldExceptionDto | null>
        >(
          `${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.YT_CLIP}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.DOWNLOAD}`,
          payload,
          this.baseAuthHeaders,
        );
      } else {
        const ext = path.extname(file.originalname);

        const form = new FormData();

        form.append('file', file.buffer, { filename: `background.${ext}` });
        form.append('movieId', movieId.toString());
        form.append('type', type);

        const mime = file.mimetype as 'image/' | 'video/';

        if (mime.startsWith('image/')) {
          result = await this.httpService.axiosRef.post(
            `${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.YT_CLIP}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.DOWNLOAD}`,
            form,
            {
              headers: {
                ...form.getHeaders(),
                Authorization: this.baseAuthHeaders.headers?.Authorization,
              },
              maxBodyLength: Infinity,
            },
          );
        } else {
          void this.httpService.axiosRef.post(
            `${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.YT_CLIP}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.DOWNLOAD}`,
            form,
            {
              headers: {
                ...form.getHeaders(),
                Authorization: this.baseAuthHeaders.headers?.Authorization,
              },
              maxBodyLength: Infinity,
            },
          );
          result = {
            data: this.appNotification.success(null),
          } as AxiosResponse;
        }
      }

      if (!result?.data?.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.downloadPreviewClip.name);
    }
  }

  uploadFilm(
    movieId: number,
    file: Express.Multer.File,
    type: MovieTypesEnum,
  ): AppNotificationResult<null, ErrorFieldExceptionDto | null> {
    try {
      const form = new FormData();
      const ext = path.extname(file.originalname);

      form.append('file', file.buffer, { filename: `background.${ext}` });
      form.append('movieId', movieId.toString());
      form.append('type', type);

      void this.httpService.axiosRef.post(
        `${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.MOVIE}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.UPLOAD}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: this.baseAuthHeaders.headers?.Authorization,
          },
          maxBodyLength: Infinity,
        },
      );

      return this.appNotification.success(null);
    } catch (error) {
      return this.handleError(error, this.uploadFilm.name);
    }
  }

  /*
   *
   *  Resize poster, logo and save
   *
   */
  async resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      let result: AxiosResponse<
        AppNotificationResult<string, ErrorFieldExceptionDto | null>
      > | null = null;
      if (typeof file === 'string') {
        const payload: ResizeAndSafeLogoPayloadDto = {
          movieId,
          url: file,
          type,
        };

        result = await this.httpService.axiosRef.post<
          AppNotificationResult<string, ErrorFieldExceptionDto | null>
        >(
          `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.POSTER}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.RESIZE}`,
          payload,
          this.baseAuthHeaders,
        );
      } else {
        const ext = path.extname(file.originalname);

        const form = new FormData();

        form.append('file', file.buffer, { filename: `poster.${ext}` });
        form.append('movieId', movieId.toString());
        form.append('type', type);

        result = await this.httpService.axiosRef.post(
          `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.POSTER}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.RESIZE}`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              Authorization: this.baseAuthHeaders.headers?.Authorization,
            },
            maxBodyLength: Infinity,
          },
        );
      }

      if (!result?.data?.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.resizeAndSavePoster.name);
    }
  }

  async resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      let result: AxiosResponse<AppNotificationResult<string, ErrorFieldExceptionDto | null>>;
      if (typeof file === 'string') {
        const payload: ResizeAndSafeLogoPayloadDto = {
          movieId,
          url: file,
          type,
        };

        result = await this.httpService.axiosRef.post(
          `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.LOGO}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.RESIZE}`,
          payload,
          this.baseAuthHeaders,
        );
      } else {
        const ext = path.extname(file.originalname);

        const form = new FormData();

        form.append('file', file.buffer, { filename: `logo.${ext}` });
        form.append('movieId', movieId.toString());
        form.append('type', type);

        result = await this.httpService.axiosRef.post(
          `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.LOGO}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.RESIZE}`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              Authorization: this.baseAuthHeaders.headers?.Authorization,
            },
            maxBodyLength: Infinity,
          },
        );
      }

      if (!result?.data?.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.resizeAndSaveLogo.name);
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
      const form = new FormData();

      form.append('file', file.buffer, { filename: `avatar.${extension}` });
      form.append('adminId', adminId.toString());
      form.append('extension', extension);
      form.append('currentAvatarPath', currentAvatarPath);

      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<string, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS.AVATAR}/${DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS.UPLOAD}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: this.baseAuthHeaders.headers?.Authorization,
          },
          maxBodyLength: Infinity,
        },
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.adminUploadAvatar.name);
    }
  }
}
