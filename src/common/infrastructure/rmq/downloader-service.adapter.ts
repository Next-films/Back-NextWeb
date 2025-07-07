import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  BRIDGE_DOWNLOAD_CARTOONS_CMD,
  BRIDGE_DOWNLOAD_FILMS_CMD,
  BRIDGE_DOWNLOAD_SERIALS_CMD,
  BRIDGE_FIND_CARTOONS_CMD,
  BRIDGE_FIND_FILMS_CMD,
  BRIDGE_FIND_SERIALS_CMD,
  CLEAR_LOGS_CMD,
  DOWNLOAD_SERVICE_RMQ_NAME,
  REMOVE_MOVIE_CMD,
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
import { RemoveMoviePayloadDto } from '@/admin/domain/types';

@Injectable()
export class DownloaderServiceAdapter {
  private readonly auth_token: string;

  constructor(
    @Inject(DOWNLOAD_SERVICE_RMQ_NAME) private readonly client: ClientProxy,
    protected readonly logger: LoggerService,
    protected readonly appNotification: ApplicationNotification,
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
}

@Injectable()
export class DownloaderServiceAdapterMock extends DownloaderServiceAdapter {
  constructor(
    client: ClientProxy,
    logger: LoggerService,
    appNotification: ApplicationNotification,
    configService: ConfigService<ConfigurationType, true>,
  ) {
    super(client, logger, appNotification, configService);
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
}
