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
import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';

const kinopoiskServiceProvider = {
  provide: KinopoiskService,
  useFactory: (
    configService: ConfigService<ConfigurationType, true>,
    logger: LoggerService,
    httpService: HttpService,
    externalApiConfigService: ExternalApiConfigService,
  ) => {
    const env = configService.get('environmentSettings', { infer: true });

    return env.isTesting || env.isDevelopment
      ? new KinopoiskServiceMock(logger, httpService, configService, externalApiConfigService)
      : new KinopoiskService(logger, httpService, configService, externalApiConfigService);
  },
  inject: [ConfigService, LoggerService, HttpService, ExternalApiConfigService],
};

const exportProviders = [KinopoiskService];

@Module({
  imports: [
    ExternalApiConfigModule,
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigurationType, true>) => {
        const baseURL = configService.get('apiSettings', { infer: true }).KINOPOISK_API_URL; // Without '/' at the end of the line
        const apiKey =
          configService
            .get('apiSettings', { infer: true })
            .KINOPOISK_API_TOKEN?.split(',')
            ?.map(token => token.trim())
            ?.find(Boolean) ?? '';

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
