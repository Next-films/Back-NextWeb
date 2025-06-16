import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  KinopoiskService,
  KinopoiskServiceMock,
} from '@/external-api/kinopoisk/application/kinopoisk.service';
import { KINOPOISK_AUTH_HEADER } from '@/external-api/kinopoisk/domain/kinopoisk.constants';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';

const kinopoiskServiceProvider = {
  provide: KinopoiskService,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    httpService: HttpService,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });

    // TODO: вернуть
    //return env.isTesting || env.isDevelopment
    return env.isTesting
      ? new KinopoiskServiceMock(logger, httpService)
      : new KinopoiskService(logger, httpService);
  },
  inject: [ConfigService, LoggerService, HttpService],
};

const exportProviders = [KinopoiskService];

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigurationType, true>) => {
        const baseURL = configService.get('apiSettings', { infer: true }).KINOPOISK_API_URL; // Without '/' at the end of the line
        const apiKey = configService.get('apiSettings', { infer: true }).KINOPOISK_API_TOKEN;

        return {
          baseURL,
          headers: {
            [KINOPOISK_AUTH_HEADER]: apiKey,
          },
        };
      },
    }),
  ],
  controllers: [],
  providers: [kinopoiskServiceProvider],
  exports: [...exportProviders],
})
export class KinopoiskModule {}
