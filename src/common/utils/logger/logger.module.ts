import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { WinstonService } from '@/common/utils/logger/winston.service';

@Module({})
export class LoggerModule {
  static forRoot(serviceName: string): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        LoggerService,
        AsyncLocalStorageService,
        {
          provide: WinstonService,
          useFactory: (configService: ConfigService<ConfigurationType, true>) => {
            return new WinstonService(configService, serviceName);
          },
          inject: [ConfigService],
        },
      ],
      exports: [LoggerService],
    };
  }
}
