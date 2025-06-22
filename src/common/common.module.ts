import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@/common/utils/logger/logger.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationNotification } from '@/common/utils/app-notification.util';
import { typeOrmModule } from '@/common/infrastructure/db/typeorm-pg.module';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { JwtExpirationUtil } from '@/common/utils/jwt-expiration.util';
import { rmqClients } from '@/common/infrastructure/rmq/rmq.client';
import {
  DownloaderServiceAdapter,
  DownloaderServiceAdapterMock,
} from '@/common/infrastructure/rmq/downloader-service.adapter';
import { DateUtil } from '@/common/utils/date.util';
import { ScheduleModule } from '@nestjs/schedule';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DOWNLOAD_SERVICE_RMQ_NAME } from '@/common/constants/rmq.constants';
import { ClientProxy } from '@nestjs/microservices';

const downloaderServiceAdapterProvider = {
  provide: DownloaderServiceAdapter,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    appNotification: ApplicationNotification,
    client: ClientProxy,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });

    return env.isTesting || env.isDevelopment
      ? new DownloaderServiceAdapterMock(client, logger, appNotification, configService)
      : new DownloaderServiceAdapter(client, logger, appNotification, configService);
  },
  inject: [ConfigService, LoggerService, ApplicationNotification, DOWNLOAD_SERVICE_RMQ_NAME],
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
    rmqClients,
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
