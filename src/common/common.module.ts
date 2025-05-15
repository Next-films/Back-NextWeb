import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@/common/utils/logger/logger.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationNotification } from '@/common/utils/app-notification.util';

@Global()
@Module({
  imports: [LoggerModule.forRoot('App'), CqrsModule],
  controllers: [],
  providers: [ApplicationNotification],
  exports: [LoggerModule, ApplicationNotification, CqrsModule],
})
export class CommonModule {}
