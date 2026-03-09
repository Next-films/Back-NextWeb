import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@/common/utils/logger/logger.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationNotification } from '@/common/utils/app-notification.util';
import { typeOrmModule } from '@/common/infrastructure/db/typeorm-pg.module';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { JwtExpirationUtil } from '@/common/utils/jwt-expiration.util';

import { DateUtil } from '@/common/utils/date.util';
import { ScheduleModule } from '@nestjs/schedule';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DOWNLOAD_SERVICE_RMQ_NAME } from '@/common/constants/rmq.constants';
import { ClientProxy } from '@nestjs/microservices';
import { DownloaderServiceRestAdapter } from '@/common/infrastructure/rest/downloader-service.rest.adapter';
import { HttpService } from '@nestjs/axios';
import { DownloaderServiceRestModule } from '@/common/infrastructure/rest/downloader-service-rest.module';
import { DOWNLOADER_HTTP_SERVICE } from '@/common/constants/downloader-service.rest.constants';
import { RmqClientModule } from '@/common/infrastructure/rmq/rmq-clients.module';
import {
  DownloaderServiceAdapter,
  DownloaderServiceAdapterMock,
} from '@/common/infrastructure/rmq/downloader-service.adapter';
import { DownloaderServiceSwitchAdapter } from '@/common/infrastructure/downloader/downloader-service-switch.adapter';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';

const hasClientProxyMethods = (client: ClientProxy | undefined | null): client is ClientProxy => {
  return !!client && typeof (client as any).emit === 'function' && typeof (client as any).send === 'function';
};

const downloaderServiceAdapterProvider = {
  provide: DownloaderServiceAdapter,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    appNotification: ApplicationNotification,
    rmqClient: ClientProxy | undefined,
    httpService: HttpService,
    modeService: DownloaderTransportModeService,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });
    const businessRulesSettings = configService.get('businessRulesSettings', { infer: true });
    const isRmqEnable = businessRulesSettings.IS_RMQ_ENABLE;

    if (env.isTesting || env.isDevelopment) {
      logger.warn('Using DownloaderServiceAdapterMock (test/development mode).', 'downloaderServiceAdapterProvider');
      return new DownloaderServiceAdapterMock(logger, appNotification);
    }

    const restAdapter = new DownloaderServiceRestAdapter(
      logger,
      appNotification,
      configService,
      httpService,
    );

    let rmqAdapter: DownloaderServiceAdapter | null = null;
    if (isRmqEnable && hasClientProxyMethods(rmqClient)) {
      rmqAdapter = new DownloaderServiceAdapter(logger, appNotification, rmqClient, configService);
    }

    if (isRmqEnable && !rmqAdapter) {
      throw new Error('RMQ enabled but client proxy is invalid.');
    }

    logger.log(
      `Using DownloaderServiceSwitchAdapter. Current mode: ${modeService.getMode()}`,
      'downloaderServiceAdapterProvider',
    );

    return new DownloaderServiceSwitchAdapter(rmqAdapter, restAdapter, modeService, logger) as any;
  },
  inject: [
    ConfigService,
    LoggerService,
    ApplicationNotification,
    DOWNLOAD_SERVICE_RMQ_NAME,
    DOWNLOADER_HTTP_SERVICE,
    DownloaderTransportModeService,
  ],
};

const exportProviders = [
  LoggerModule,
  ApplicationNotification,
  CqrsModule,
  PaginationUtil,
  JwtExpirationUtil,
  DownloaderServiceAdapter,
  DateUtil,
  RmqResultHandlerUtil,
  AsyncLocalStorageService,
  DownloaderTransportModeService,
];

@Global()
@Module({
  imports: [
    typeOrmModule,
    LoggerModule.forRoot('App'),
    CqrsModule,
    DownloaderServiceRestModule,
    RmqClientModule.register(),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    ApplicationNotification,
    PaginationUtil,
    JwtExpirationUtil,
    downloaderServiceAdapterProvider,
    DateUtil,
    RmqResultHandlerUtil,
    AsyncLocalStorageService,
    DownloaderTransportModeService,
  ],
  exports: [...exportProviders],
})
export class CommonModule {}
