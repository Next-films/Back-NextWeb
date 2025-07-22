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

const downloaderServiceAdapterProvider = {
  provide: DownloaderServiceAdapter,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    appNotification: ApplicationNotification,
    rmqClient: ClientProxy | undefined,
    httpService: HttpService,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });
    const businessRulesSettings = configService.get('businessRulesSettings', { infer: true });
    const isRmqEnable = businessRulesSettings.IS_RMQ_ENABLE;

    if (env.isTesting) {
      return new DownloaderServiceAdapterMock(logger, appNotification);
    }

    if (isRmqEnable && rmqClient) {
      return new DownloaderServiceAdapter(logger, appNotification, rmqClient, configService);
    }

    return new DownloaderServiceRestAdapter(logger, appNotification, configService, httpService);
  },
  inject: [
    ConfigService,
    LoggerService,
    ApplicationNotification,
    DOWNLOAD_SERVICE_RMQ_NAME,
    DOWNLOADER_HTTP_SERVICE,
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
  ],
  exports: [...exportProviders],
})
export class CommonModule {}
