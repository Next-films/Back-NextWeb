import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import {
  FanartMovieBackground,
  FanartMovieBackgroundLookupInput,
  FanartMovieResponse,
} from '@/external-api/fanart/domain/types';

type FanartRequestConfig = {
  baseURL: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  timeout: number;
  versionInBaseUrl: boolean;
};

const FANART_REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class FanartService {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(FanartService.name);
  }

  async getMovieBackgroundUrls(input: FanartMovieBackgroundLookupInput): Promise<string[]> {
    const mediaId = input.tmdbId?.toString() || input.imdbId?.trim();
    if (!mediaId) return [];

    const requestConfigs = await this.getRequestConfigs();
    if (!requestConfigs.length) return [];

    for (const requestConfig of requestConfigs) {
      try {
        const response = await this.httpService.axiosRef.get<FanartMovieResponse>(
          `${requestConfig.versionInBaseUrl ? '' : '/v3.2'}/movies/${encodeURIComponent(mediaId)}`,
          requestConfig,
        );

        return this.getBackgroundUrls(response.data.moviebackground || []);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) return [];

        if (!this.shouldRetryRequest(error)) {
          this.logger.error(error, this.getMovieBackgroundUrls.name);
          return [];
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(message, this.getMovieBackgroundUrls.name);
      }
    }

    return [];
  }

  private async getRequestConfigs(): Promise<FanartRequestConfig[]> {
    const configs = await this.externalApiConfigService.getRotatedConfigs(
      ExternalApiProviderEnum.FANART_TV,
      ExternalApiTargetEnum.BACK,
    );

    return configs
      .map(config => this.createRequestConfig(config))
      .filter((config): config is FanartRequestConfig => Boolean(config));
  }

  private createRequestConfig(config: ExternalApiConfigEntity): FanartRequestConfig | null {
    const token = config.token?.trim();
    if (!token) return null;

    const baseURL = config.baseUrl.replace(/\/+$/, '');

    return {
      baseURL,
      headers: {
        accept: 'application/json',
      },
      params: {
        api_key: token,
      },
      timeout: FANART_REQUEST_TIMEOUT_MS,
      versionInBaseUrl: /\/v3(?:\.1|\.2)?$/.test(baseURL),
    };
  }

  private getBackgroundUrls(backgrounds: FanartMovieBackground[]): string[] {
    return backgrounds
      .map((background, index) => ({
        url: background.url?.trim() || null,
        score: this.getBackgroundScore(background, index),
      }))
      .filter(candidate => candidate.url && candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(candidate => candidate.url as string)
      .filter((url, index, urls) => urls.indexOf(url) === index);
  }

  private getBackgroundScore(background: FanartMovieBackground, index: number): number {
    const width = Number(background.width) || 0;
    const height = Number(background.height) || 0;
    const lang = background.lang || '00';
    const languageScore = lang === '00' ? 300 : lang === 'en' ? 200 : lang === 'ru' ? 100 : 0;

    if (width > 0 && height > 0 && width <= height) return 0;

    return (
      (width && height ? width * height : 10_000) +
      (Number(background.likes) || 0) * 100 +
      languageScore -
      index
    );
  }

  private shouldRetryRequest(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (!status) return true;
    return status === 401 || status === 403 || status === 429 || status >= 500;
  }
}
