import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { MovieTypesEnum } from '@/common/types/types';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import {
  TmdbAssetCandidates,
  TmdbAssetLookupInput,
  TmdbFindResponse,
  TmdbImage,
  TmdbImageConfiguration,
  TmdbMediaDetails,
  TmdbMediaType,
  TmdbSearchResponse,
  TmdbSearchResult,
  TmdbVideo,
} from '@/external-api/tmdb/domain/types';

type TmdbRequestConfig = {
  baseURL: string;
  headers: Record<string, string>;
  params: Record<string, string | number | boolean>;
  timeout: number;
};

type TmdbImageConfigCacheEntry = {
  baseUrl: string;
  backdropSize: string;
  expiresAt: number;
};

const EMPTY_ASSET_CANDIDATES: TmdbAssetCandidates = {
  tmdbId: null,
  mediaType: null,
  backdropUrls: [],
  trailerUrl: null,
};
const TMDB_REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class TmdbService {
  private readonly imageConfigCache = new Map<string, TmdbImageConfigCacheEntry>();
  private readonly imageConfigTtlMs = 60 * 60 * 1000;

  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(TmdbService.name);
  }

  async getAssetCandidates(input: TmdbAssetLookupInput): Promise<TmdbAssetCandidates> {
    const requestConfigs = await this.getRequestConfigs();
    if (!requestConfigs.length) return EMPTY_ASSET_CANDIDATES;

    for (const requestConfig of requestConfigs) {
      try {
        const resolvedMedia = await this.resolveMedia(requestConfig, input);
        if (!resolvedMedia) continue;

        const details = await this.getMediaDetails(
          requestConfig,
          resolvedMedia.mediaType,
          resolvedMedia.id,
        );
        if (!details) continue;

        const imageConfig = await this.getImageConfig(requestConfig);

        return {
          tmdbId: resolvedMedia.id,
          mediaType: resolvedMedia.mediaType,
          backdropUrls: this.getBackdropUrls(details, imageConfig),
          trailerUrl: this.getTrailerUrl(details),
        };
      } catch (error: unknown) {
        if (!this.shouldRetryRequest(error)) {
          this.logger.error(error, this.getAssetCandidates.name);
          return EMPTY_ASSET_CANDIDATES;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(message, this.getAssetCandidates.name);
      }
    }

    return EMPTY_ASSET_CANDIDATES;
  }

  async getTrailerCandidate(input: TmdbAssetLookupInput): Promise<string | null> {
    const requestConfigs = await this.getRequestConfigs();
    if (!requestConfigs.length) return null;

    for (const requestConfig of requestConfigs) {
      try {
        const resolvedMedia = await this.resolveMedia(requestConfig, input);
        if (!resolvedMedia) continue;

        const details = await this.getMediaDetails(
          requestConfig,
          resolvedMedia.mediaType,
          resolvedMedia.id,
          false,
        );
        if (!details) continue;

        const trailerUrl = this.getTrailerUrl(details);
        if (trailerUrl) return trailerUrl;
      } catch (error: unknown) {
        if (!this.shouldRetryRequest(error)) {
          this.logger.error(error, this.getTrailerCandidate.name);
          return null;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(message, this.getTrailerCandidate.name);
      }
    }

    return null;
  }

  async getDescriptionCandidate(input: TmdbAssetLookupInput): Promise<string | null> {
    const requestConfigs = await this.getRequestConfigs();
    if (!requestConfigs.length) return null;

    for (const requestConfig of requestConfigs) {
      try {
        const resolvedMedia = await this.resolveMedia(requestConfig, input);
        if (!resolvedMedia) continue;

        const description = await this.getDescriptionByLanguage(
          requestConfig,
          resolvedMedia.mediaType,
          resolvedMedia.id,
          'ru-RU',
        );

        if (description && /[А-Яа-яЁё]/.test(description)) return description;
      } catch (error: unknown) {
        if (!this.shouldRetryRequest(error)) {
          this.logger.error(error, this.getDescriptionCandidate.name);
          return null;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(message, this.getDescriptionCandidate.name);
      }
    }

    return null;
  }

  private async getRequestConfigs(): Promise<TmdbRequestConfig[]> {
    const configs = await this.externalApiConfigService.getRotatedConfigs(
      ExternalApiProviderEnum.TMDB,
      ExternalApiTargetEnum.BACK,
    );

    return configs
      .map(config => this.createRequestConfig(config))
      .filter((config): config is TmdbRequestConfig => Boolean(config));
  }

  private createRequestConfig(config: ExternalApiConfigEntity): TmdbRequestConfig | null {
    const token = config.token?.trim();
    if (!token) return null;

    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    const params: Record<string, string | number | boolean> = {};

    if (this.isBearerToken(token)) {
      headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
    } else {
      params.api_key = token;
    }

    return {
      baseURL: this.normalizeApiBaseUrl(config.baseUrl),
      headers,
      params,
      timeout: TMDB_REQUEST_TIMEOUT_MS,
    };
  }

  private normalizeApiBaseUrl(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/+$/, '');
    return normalized.endsWith('/3') ? normalized : `${normalized}/3`;
  }

  private isBearerToken(token: string): boolean {
    return token.toLowerCase().startsWith('bearer ') || token.split('.').length === 3;
  }

  private async resolveMedia(
    requestConfig: TmdbRequestConfig,
    input: TmdbAssetLookupInput,
  ): Promise<{ id: number; mediaType: TmdbMediaType } | null> {
    const mediaType = this.resolveMediaType(input.movieType);

    if (input.tmdbId) {
      return { id: input.tmdbId, mediaType };
    }

    const imdbId = input.imdbId?.trim();
    if (imdbId) {
      const foundByImdb = await this.findByImdbId(requestConfig, imdbId, mediaType);
      if (foundByImdb) return foundByImdb;
    }

    return this.searchByTitle(requestConfig, input, mediaType);
  }

  private resolveMediaType(movieType: MovieTypesEnum): TmdbMediaType {
    return movieType === MovieTypesEnum.SERIAL ? 'tv' : 'movie';
  }

  private async findByImdbId(
    requestConfig: TmdbRequestConfig,
    imdbId: string,
    preferredMediaType: TmdbMediaType,
  ): Promise<{ id: number; mediaType: TmdbMediaType } | null> {
    const response = await this.httpService.axiosRef.get<TmdbFindResponse>(`/find/${imdbId}`, {
      ...requestConfig,
      params: {
        ...requestConfig.params,
        external_source: 'imdb_id',
      },
    });

    const preferredResults =
      preferredMediaType === 'tv' ? response.data.tv_results : response.data.movie_results;
    const fallbackResults =
      preferredMediaType === 'tv' ? response.data.movie_results : response.data.tv_results;
    const result = this.pickBestSearchResult([
      ...(preferredResults || []),
      ...(fallbackResults || []),
    ]);

    if (!result?.id) return null;

    return {
      id: result.id,
      mediaType: (preferredResults || []).some(item => item.id === result.id)
        ? preferredMediaType
        : preferredMediaType === 'tv'
        ? 'movie'
        : 'tv',
    };
  }

  private async searchByTitle(
    requestConfig: TmdbRequestConfig,
    input: TmdbAssetLookupInput,
    mediaType: TmdbMediaType,
  ): Promise<{ id: number; mediaType: TmdbMediaType } | null> {
    const query = (input.originalTitle || input.title || '').trim();
    if (!query) return null;

    const yearParam = mediaType === 'tv' ? 'first_air_date_year' : 'year';
    const response = await this.httpService.axiosRef.get<TmdbSearchResponse>(
      `/search/${mediaType}`,
      {
        ...requestConfig,
        params: {
          ...requestConfig.params,
          query,
          include_adult: false,
          language: 'en-US',
          ...(input.year ? { [yearParam]: input.year } : {}),
        },
      },
    );
    const result = this.pickBestSearchResult(response.data.results || []);

    return result?.id ? { id: result.id, mediaType } : null;
  }

  private pickBestSearchResult(results: TmdbSearchResult[]): TmdbSearchResult | null {
    return (
      results
        .map((result, index) => ({
          result,
          score: (result.backdrop_path ? 1_000 : 0) + 100 - index,
        }))
        .sort((a, b) => b.score - a.score)[0]?.result || null
    );
  }

  private async getMediaDetails(
    requestConfig: TmdbRequestConfig,
    mediaType: TmdbMediaType,
    tmdbId: number,
    includeImages = true,
    language = 'en-US',
  ): Promise<TmdbMediaDetails | null> {
    const response = await this.httpService.axiosRef.get<TmdbMediaDetails>(
      `/${mediaType}/${tmdbId}`,
      {
        ...requestConfig,
        params: {
          ...requestConfig.params,
          append_to_response: includeImages ? 'images,videos' : 'videos',
          ...(includeImages ? { include_image_language: 'en,null,ru' } : {}),
          language,
        },
      },
    );

    return response.data || null;
  }

  private async getDescriptionByLanguage(
    requestConfig: TmdbRequestConfig,
    mediaType: TmdbMediaType,
    tmdbId: number,
    language: string,
  ): Promise<string | null> {
    const details = await this.getMediaDetails(requestConfig, mediaType, tmdbId, false, language);
    return details?.overview?.trim() || null;
  }

  private async getImageConfig(
    requestConfig: TmdbRequestConfig,
  ): Promise<TmdbImageConfigCacheEntry> {
    const cacheKey = `${requestConfig.baseURL}|${
      requestConfig.params.api_key || requestConfig.headers.Authorization || ''
    }`;
    const cached = this.imageConfigCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) return cached;

    try {
      const response = await this.httpService.axiosRef.get<TmdbImageConfiguration>(
        '/configuration',
        {
          ...requestConfig,
          params: {
            ...requestConfig.params,
          },
        },
      );
      const secureBaseUrl = response.data.images?.secure_base_url || 'https://image.tmdb.org/t/p/';
      const backdropSizes = response.data.images?.backdrop_sizes || [];
      const backdropSize = backdropSizes.includes('w1280') ? 'w1280' : 'original';
      const imageConfig = {
        baseUrl: secureBaseUrl,
        backdropSize,
        expiresAt: now + this.imageConfigTtlMs,
      };

      this.imageConfigCache.set(cacheKey, imageConfig);
      return imageConfig;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(message, this.getImageConfig.name);

      return {
        baseUrl: 'https://image.tmdb.org/t/p/',
        backdropSize: 'w1280',
        expiresAt: now + this.imageConfigTtlMs,
      };
    }
  }

  private getBackdropUrls(
    details: TmdbMediaDetails,
    imageConfig: Pick<TmdbImageConfigCacheEntry, 'baseUrl' | 'backdropSize'>,
  ): string[] {
    const backdrops = details.images?.backdrops || [];
    const candidates = [
      ...(details.backdrop_path
        ? [{ file_path: details.backdrop_path, width: 16, height: 9, vote_average: 10 }]
        : []),
      ...backdrops,
    ];

    return candidates
      .map((image, index) => ({
        url: this.buildImageUrl(image.file_path, imageConfig),
        score: this.getBackdropScore(image, index),
      }))
      .filter(candidate => candidate.url && candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(candidate => candidate.url as string)
      .filter((url, index, urls) => urls.indexOf(url) === index);
  }

  private buildImageUrl(
    filePath: string | null | undefined,
    imageConfig: Pick<TmdbImageConfigCacheEntry, 'baseUrl' | 'backdropSize'>,
  ): string | null {
    if (!filePath?.trim()) return null;
    return `${imageConfig.baseUrl}${imageConfig.backdropSize}${filePath}`;
  }

  private getBackdropScore(image: TmdbImage, index: number): number {
    const width = Number(image.width) || 0;
    const height = Number(image.height) || 0;
    const language = image.iso_639_1 || 'null';
    const languageScore =
      language === 'null' ? 300 : language === 'en' ? 200 : language === 'ru' ? 100 : 0;

    if (width > 0 && height > 0 && width <= height) return 0;

    return (
      (width && height ? width * height : 10_000) +
      (Number(image.vote_average) || 0) * 100 +
      (Number(image.vote_count) || 0) * 10 +
      languageScore -
      index
    );
  }

  private getTrailerUrl(details: TmdbMediaDetails): string | null {
    const bestTrailerKey =
      (details.videos?.results || [])
        .filter(video => video.key?.trim() && video.site?.toLowerCase() === 'youtube')
        .map((video, index) => ({
          key: video.key!.trim(),
          score: this.getTrailerScore(video, index),
        }))
        .sort((a, b) => b.score - a.score)[0]?.key || null;

    return bestTrailerKey ? `https://www.youtube.com/watch?v=${bestTrailerKey}` : null;
  }

  private getTrailerScore(video: TmdbVideo, index: number): number {
    const type = video.type?.toLowerCase() || '';
    const language = video.iso_639_1 || '';

    return (
      (video.official ? 10_000 : 0) +
      (type === 'trailer' ? 1_000 : type === 'teaser' ? 500 : 0) +
      (language === 'en' ? 200 : language === 'ru' ? 100 : 0) +
      (Number(video.size) || 0) -
      index
    );
  }

  private shouldRetryRequest(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (!status) return true;
    return status === 401 || status === 403 || status === 429 || status >= 500;
  }
}
