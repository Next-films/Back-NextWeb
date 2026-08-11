import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KINOPOISK_METHODS_CONSTANTS } from '@/external-api/kinopoisk/domain/kinopoisk.constants';
import {
  KinopoiskImage,
  KinopoiskMovie,
  KinopoiskPaginatedResponse,
} from '@/external-api/kinopoisk/domain/types';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ConfigurationType } from '@/settings/configuration';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { KINOPOISK_AUTH_HEADER } from '@/external-api/kinopoisk/domain/kinopoisk.constants';

@Injectable()
export class KinopoiskService {
  private readonly MOVIES: string = `/${KINOPOISK_METHODS_CONSTANTS.MOVIE.MOVIE}`;
  private readonly IMAGES = '/image';
  private fallbackTokenIndex = 0;
  constructor(
    protected readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(KinopoiskService.name);
  }

  private parseTokens(rawToken: string | null | undefined): string[] {
    return (rawToken ?? '')
      .split(',')
      .map(token => token.trim())
      .filter(Boolean);
  }

  private mergeTokens(...tokensList: string[][]): string[] {
    const uniq = new Set<string>();

    for (const tokens of tokensList) {
      for (const token of tokens) uniq.add(token);
    }

    return [...uniq];
  }

  private rotateTokens(tokens: string[]): string[] {
    if (tokens.length <= 1) return tokens;

    const startIndex = this.fallbackTokenIndex % tokens.length;
    this.fallbackTokenIndex = startIndex + 1;
    return [...tokens.slice(startIndex), ...tokens.slice(0, startIndex)];
  }

  private async getRequestConfigs(): Promise<
    Array<{ baseURL: string; headers: Record<string, string> }>
  > {
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const envTokens = this.parseTokens(apiSettings.KINOPOISK_API_TOKEN);
    const externalConfigs = await this.externalApiConfigService.getRotatedConfigs(
      ExternalApiProviderEnum.KINOPOISK,
      ExternalApiTargetEnum.BACK,
    );

    const requestConfigs: Array<{ baseURL: string; headers: Record<string, string> }> = [];
    const dedupe = new Set<string>();
    const pushConfig = (baseURL: string, token: string | null) => {
      const key = `${baseURL}|${token ?? ''}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);

      const headers: Record<string, string> = {};
      if (token) headers[KINOPOISK_AUTH_HEADER] = token;
      requestConfigs.push({ baseURL, headers });
    };

    const rotatedEnvTokens = this.rotateTokens(envTokens);
    if (rotatedEnvTokens.length) {
      for (const token of rotatedEnvTokens) pushConfig(apiSettings.KINOPOISK_API_URL, token);
    } else {
      pushConfig(apiSettings.KINOPOISK_API_URL, null);
    }

    for (const config of externalConfigs) {
      const tokens = this.mergeTokens(this.parseTokens(config.token), envTokens);
      const rotatedTokens = this.rotateTokens(tokens);

      if (!rotatedTokens.length) {
        pushConfig(config.baseUrl, null);
        continue;
      }

      for (const token of rotatedTokens) pushConfig(config.baseUrl, token);
    }

    return requestConfigs;
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

  async getImagesByMovieId(movieId: number, limit = 50): Promise<KinopoiskImage[]> {
    const requestConfigs = await this.getRequestConfigs();

    for (const requestConfig of requestConfigs) {
      try {
        const response = await this.httpService.axiosRef.get<
          KinopoiskPaginatedResponse<KinopoiskImage>
        >(this.IMAGES, {
          ...requestConfig,
          params: {
            movieId,
            limit,
            page: 1,
          },
        });

        return response.data?.docs || [];
      } catch (error: unknown) {
        if (!this.shouldRetryRequest(error)) {
          this.logger.error(error, this.getImagesByMovieId.name);
          return [];
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(message, this.getImagesByMovieId.name);
      }
    }

    return [];
  }

  async getBestLandscapeImageByMovieId(movieId: number): Promise<string | null> {
    return (await this.getLandscapeImageUrlsByMovieId(movieId))[0] || null;
  }

  async getLandscapeImageUrlsByMovieId(movieId: number): Promise<string[]> {
    const images = await this.getImagesByMovieId(movieId);

    return images
      .map((image, index) => ({
        url: this.getImageUrl(image),
        score: this.getLandscapeImageScore(image, index),
      }))
      .filter(candidate => candidate.url && candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(candidate => candidate.url as string)
      .filter((url, index, allUrls) => allUrls.indexOf(url) === index);
  }

  private getImageUrl(image: KinopoiskImage): string | null {
    const url = image.url || image.previewUrl;
    return url?.trim() || null;
  }

  private getLandscapeImageScore(image: KinopoiskImage, index: number): number {
    const typePriority: Record<string, number> = {
      cover: 10,
      wallpaper: 9,
      screenshot: 8,
      frame: 7,
      promo: 6,
      concept: 5,
      fan_art: 4,
    };
    const type = (image.type || '').toLowerCase();
    const width = Number(image.width) || 0;
    const height = Number(image.height) || 0;

    if (width > 0 && height > 0) {
      if (width <= height) return 0;
      return width * height + (typePriority[type] || 1) * 100_000 - index;
    }

    if (!typePriority[type]) return 0;

    return typePriority[type] * 100_000 - index;
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

  async getImagesByMovieId(): Promise<KinopoiskImage[]> {
    this.logger.log('Get images by movie id (mock)', this.getImagesByMovieId.name);
    await new Promise(resolve => resolve(null));
    return [];
  }
}
