import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { DOWNLOADER_HTTP_SERVICE } from '@/common/constants/downloader-service.rest.constants';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigurationType, true>) => {
        const rawBaseURL = configService.get('apiSettings', { infer: true }).DOWNLOAD_SERVICE_HTTP_URL;
        const normalizedBaseURL = rawBaseURL.replace(/\/+$/, '');
        const baseURL = normalizedBaseURL.endsWith('/api')
          ? normalizedBaseURL
          : `${normalizedBaseURL}/api`;

        return {
          baseURL,
        };
      },
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: DOWNLOADER_HTTP_SERVICE,
      useExisting: HttpService,
    },
  ],
  exports: [DOWNLOADER_HTTP_SERVICE],
})
export class DownloaderServiceRestModule {}
