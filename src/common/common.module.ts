import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@/common/utils/logger/logger.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationNotification } from '@/common/utils/app-notification.util';
import { typeOrmModule } from '@/common/infrastructure/db/typeorm-pg.module';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { JwtExpirationUtil } from '@/common/utils/jwt-expiration.util';
import { rmqClients } from '@/common/infrastructure/rmq/rmq.client';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { DateUtil } from '@/common/utils/date.util';

const exportProviders = [
  LoggerModule,
  ApplicationNotification,
  CqrsModule,
  PaginationUtil,
  JwtExpirationUtil,
  DownloaderServiceAdapter,
  DateUtil,
];

@Global()
@Module({
  imports: [typeOrmModule, LoggerModule.forRoot('App'), CqrsModule, rmqClients],
  controllers: [],
  providers: [
    ApplicationNotification,
    PaginationUtil,
    JwtExpirationUtil,
    DownloaderServiceAdapter,
    DateUtil,
  ],
  exports: [...exportProviders],
})
export class CommonModule {}
