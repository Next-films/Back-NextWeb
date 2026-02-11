import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KINOPOISK_METHODS_CONSTANTS } from '@/external-api/kinopoisk/domain/kinopoisk.constants';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ConfigurationType } from '@/settings/configuration';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { KINOPOISK_AUTH_HEADER } from '@/external-api/kinopoisk/domain/kinopoisk.constants';

@Injectable()
export class KinopoiskService {
  private readonly MOVIES: string = `/${KINOPOISK_METHODS_CONSTANTS.MOVIE.MOVIE}`;
  constructor(
    protected readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(KinopoiskService.name);
  }

  private async getRequestConfigs(): Promise<
    Array<{ baseURL: string; headers: Record<string, string> }>
  > {
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const externalConfigs = await this.externalApiConfigService.getRotatedConfigs(
      ExternalApiProviderEnum.KINOPOISK,
      ExternalApiTargetEnum.BACK,
    );

    if (!externalConfigs.length) {
      const headers: Record<string, string> = {};
      if (apiSettings.KINOPOISK_API_TOKEN) {
        headers[KINOPOISK_AUTH_HEADER] = apiSettings.KINOPOISK_API_TOKEN;
      }

      return [{ baseURL: apiSettings.KINOPOISK_API_URL, headers }];
    }

    return externalConfigs.map(config => {
      const headers: Record<string, string> = {};
      if (config.token) headers[KINOPOISK_AUTH_HEADER] = config.token;
      return { baseURL: config.baseUrl, headers };
    });
  }

  private shouldRetryRequest(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (!status) return true;
    return status === 401 || status === 403 || status === 429 || status >= 500;
  }

  async getMovieById(movieId: number): Promise<KinopoiskMovie | null> {
    const url = `${this.MOVIES}/${movieId}`;
    const requestConfigs = await this.getRequestConfigs();

    for (const requestConfig of requestConfigs) {
      try {
        const response = await this.httpService.axiosRef.get<KinopoiskMovie>(url, requestConfig);
        return response.data || null;
      } catch (error: unknown) {
        if (!this.shouldRetryRequest(error)) {
          this.logger.error(error, this.getMovieById.name);
          return null;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(message, this.getMovieById.name);
      }
    }

    return null;
  }
}

export class KinopoiskServiceMock extends KinopoiskService {
  constructor(
    logger: LoggerService,
    httpService: HttpService,
    configService: ConfigService<ConfigurationType, true>,
    externalApiConfigService: ExternalApiConfigService,
  ) {
    super(logger, httpService, configService, externalApiConfigService);
    this.logger.setContext(KinopoiskServiceMock.name);
  }

  async getMovieById(): Promise<KinopoiskMovie | null> {
    this.logger.log('Get movie by id (mock)', this.getMovieById.name);
    await new Promise(resolve => resolve(null));
    return {
      id: 12345,
      name: 'Film name',
      description: 'desc',
    };
  }
}
