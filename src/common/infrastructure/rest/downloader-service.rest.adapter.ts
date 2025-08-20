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
  MovieTypesEnum,
  ResizeAndSafeLogoPayloadDto,
  ResizeAndSafePosterPayloadDto,
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
} from '@/common/constants/downloader-service.rest.constants';
import { AxiosRequestConfig } from 'axios';

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
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      const payload: DownloadPreviewYtClipPayloadDto = {
        kpId,
        url,
        type,
      };

      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<string, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.YT_CLIP}/${DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS.DOWNLOAD}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.downloadPreviewClip.name);
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
      const payload: ResizeAndSafePosterPayloadDto = {
        kpId,
        url,
        type,
      };

      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<string, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.POSTER}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.RESIZE}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.resizeAndSavePoster.name);
    }
  }

  async resizeAndSaveLogo(
    kpId: string,
    url: string,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<string, ErrorFieldExceptionDto | null>> {
    try {
      const payload: ResizeAndSafeLogoPayloadDto = {
        kpId,
        url,
        type,
      };

      const result = await this.httpService.axiosRef.post<
        AppNotificationResult<string, ErrorFieldExceptionDto | null>
      >(
        `${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.LOGO}/${DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS.RESIZE}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.resizeAndSaveLogo.name);
    }
  }
}
