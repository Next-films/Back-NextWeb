import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@/common/utils/logger/logger.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationNotification } from '@/common/utils/app-notification.util';
import { typeOrmModule } from '@/common/infrastructure/db/typeorm-pg.module';
import { PaginationUtil } from '@/common/utils/pagination.util';

const exportProviders = [LoggerModule, ApplicationNotification, CqrsModule, PaginationUtil];

@Global()
@Module({
  imports: [typeOrmModule, LoggerModule.forRoot('App'), CqrsModule],
  controllers: [],
  providers: [ApplicationNotification, PaginationUtil],
  exports: [...exportProviders],
})
export class CommonModule {}
