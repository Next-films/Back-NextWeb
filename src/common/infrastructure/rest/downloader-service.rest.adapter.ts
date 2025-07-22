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
  IDownloaderServiceAdapter,
  MovieTypesEnum,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';
import { HttpService } from '@nestjs/axios';
import {
  DOWNLOADER_HTTP_SERVICE,
  DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS,
  DOWNLOADER_SERVICE_REST_LOGS_METHODS_CONSTANTS,
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

  /*
   *
   *  Bridges to download service
   *
   */
  bridgeFindFilms(): void {
    this.httpService
      .post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FILMS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FIND}`,
        {},
        this.baseAuthHeaders,
      )
      .subscribe({
        error: err => {
          this.logger.error(
            ` Request error: ${JSON.stringify(err, null, 2)}`,
            this.bridgeFindFilms.name,
          );
        },
      });
  }

  bridgeDownloadFilms(): void {
    this.httpService
      .post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FILMS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.DOWNLOAD}`,
        {},
        this.baseAuthHeaders,
      )
      .subscribe({
        error: err => {
          this.logger.error(
            ` Request error: ${JSON.stringify(err, null, 2)}`,
            this.bridgeDownloadFilms.name,
          );
        },
      });
  }

  bridgeFindCartoons(): void {
    this.httpService
      .post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.CARTOONS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FIND}`,
        {},
        this.baseAuthHeaders,
      )
      .subscribe({
        error: err => {
          this.logger.error(
            ` Request error: ${JSON.stringify(err, null, 2)}`,
            this.bridgeFindCartoons.name,
          );
        },
      });
  }

  bridgeDownloadCartoons(): void {
    this.httpService
      .post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.CARTOONS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.DOWNLOAD}`,
        {},
        this.baseAuthHeaders,
      )
      .subscribe({
        error: err => {
          this.logger.error(
            ` Request error: ${JSON.stringify(err, null, 2)}`,
            this.bridgeDownloadCartoons.name,
          );
        },
      });
  }

  bridgeFindSerials(): void {
    this.httpService
      .post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.SERIALS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.FIND}`,
        {},
        this.baseAuthHeaders,
      )
      .subscribe({
        error: err => {
          this.logger.error(
            ` Request error: ${JSON.stringify(err, null, 2)}`,
            this.bridgeFindSerials.name,
          );
        },
      });
  }

  bridgeDownloadSerials(): void {
    this.httpService
      .post(
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.SERIALS}/${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.DOWNLOAD}`,
        {},
        this.baseAuthHeaders,
      )
      .subscribe({
        error: err => {
          this.logger.error(
            ` Request error: ${JSON.stringify(err, null, 2)}`,
            this.bridgeDownloadSerials.name,
          );
        },
      });
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
        `${DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS.MAIN}/${DOWNLOADER_SERVICE_REST_LOGS_METHODS_CONSTANTS.CONVERTER_LOGS}/${DOWNLOADER_SERVICE_REST_LOGS_METHODS_CONSTANTS.CLEAR}`,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
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
      this.logger.error(error, this.addMovieToQueue.name);

      return this.appNotification.internalServerError();
    }
  }
}
