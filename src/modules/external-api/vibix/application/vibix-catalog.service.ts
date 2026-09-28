import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import {
  VibixCatalogResponse,
  VibixMediaType,
  VibixPublicItem,
  VibixVideoRecord,
} from '@/external-api/vibix/domain/vibix.types';

const VIBIX_REQUEST_TIMEOUT_MS = 25_000;
const MAX_PAGE_SIZE = 150;

@Injectable()
export class VibixCatalogService {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(VibixCatalogService.name);
  }

  async getPage(mediaType: VibixMediaType, page: number, size: number, search?: string) {
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(size)));
    const apiType = mediaType === 'serials' ? 'serial' : 'movie';
    const response = await this.requestCatalog({
      draw: safePage,
      start: (safePage - 1) * safeSize,
      length: safeSize,
      columns: [{ data: '', name: '', searchable: true, orderable: true }],
      order: [{ column: 0, dir: 'desc' }],
      filter: { type: [apiType] },
      ...(search?.trim() ? { search: { value: search.trim() } } : {}),
    });

    const records = this.getRecords(response).filter(record => this.matchesType(record, mediaType));
    const total = this.getTotal(response);

    return {
      items: records.map(record => this.toPublicItem(record)),
      pagesCount: Math.ceil(total / safeSize),
      totalCount: total,
    };
  }

  async getById(id: number): Promise<VibixPublicItem> {
    const response = await this.requestCatalog({
      draw: 1,
      start: 0,
      length: 1,
      columns: [{ data: '', name: '', searchable: true, orderable: true }],
      order: [{ column: 0, dir: 'desc' }],
      filter: { id: [id] },
    });
    const record = this.getRecords(response).find(item => Number(item.id) === id);
    if (!record) throw new NotFoundException('Vibix content not found');
    return this.toPublicItem(record);
  }

  async hasActiveConfiguration(): Promise<boolean> {
    const config = await this.externalApiConfigService.getActiveConfig(
      ExternalApiProviderEnum.VIBIX,
      ExternalApiTargetEnum.BACK,
    );
    return Boolean(config?.baseUrl?.trim() && config?.token?.trim());
  }

  private async requestCatalog(payload: Record<string, unknown>): Promise<VibixCatalogResponse> {
    const config = await this.externalApiConfigService.getActiveConfig(
      ExternalApiProviderEnum.VIBIX,
      ExternalApiTargetEnum.BACK,
    );
    const token = config?.token?.split(',')[0]?.trim();
    if (!config?.baseUrl?.trim() || !token) {
      throw new ServiceUnavailableException(
        'Vibix API is not configured. Add an enabled Vibix config for Backend.',
      );
    }

    const url = `${config.baseUrl.replace(/\/+$/, '')}/publisher/catalog/data`;
    try {
      const response = await this.httpService.axiosRef.post<VibixCatalogResponse>(
        url,
        this.toFormUrlEncoded(payload),
        {
          timeout: VIBIX_REQUEST_TIMEOUT_MS,
          headers: {
            Accept: 'application/json',
            Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(message, this.requestCatalog.name);
      throw new BadGatewayException('Vibix catalog is temporarily unavailable');
    }
  }

  private getRecords(response: VibixCatalogResponse): VibixVideoRecord[] {
    if (Array.isArray(response.data)) return response.data;
    const items = response.data?.items;
    return Array.isArray(items) ? items : [];
  }

  private getTotal(response: VibixCatalogResponse): number {
    const value = Number(response.recordsFiltered ?? response.recordsTotal ?? 0);
    return Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : this.getRecords(response).length;
  }

  private matchesType(record: VibixVideoRecord, mediaType: VibixMediaType): boolean {
    const isSerial = record.type === 'serial' || record.type === 'series';
    if (mediaType === 'serials') return isSerial;
    if (isSerial) return false;

    const genres = this.toStringList(record.genre).map(value => value.toLowerCase());
    const isAnimated = genres.some(value =>
      ['мультфильм', 'анимация', 'animation'].includes(value.trim()),
    );
    return mediaType === 'cartoons' ? isAnimated : !isAnimated;
  }

  private toPublicItem(record: VibixVideoRecord): VibixPublicItem {
    const id = Number(record.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new BadGatewayException('Vibix returned an invalid content identifier');
    }
    const isSeries = record.type === 'serial' || record.type === 'series';
    const mediaType = isSeries ? 'series' : 'movie';
    const genres = this.toStringList(record.genre);
    const year = Number(record.year);
    const releaseDate = Number.isInteger(year) && year > 1800 ? `${year}-01-01` : '';
    const previewUrl = this.normalizeImageUrl(record.poster_url ?? record.preview ?? record.poster);
    const backgroundUrl =
      this.normalizeImageUrl(record.backdrop_url ?? record.preview_backdrop ?? record.backdrop) ??
      previewUrl;

    return {
      id,
      name: this.firstString(record.name_rus, record.name, record.name_eng, record.name_original),
      description: this.firstString(record.description, record.description_short),
      duration: Number(record.duration) || 0,
      releaseDate,
      subTitle: this.firstString(record.name_original, record.name_eng),
      studio: null,
      universe: null,
      previewUrl,
      cardImg: previewUrl,
      backgroundImg: backgroundUrl,
      content: {
        movieUrl: null,
        trailerUrl: null,
        backgroundUrl,
        previewUrl,
        titleUrl: null,
      },
      country: this.toStringList(record.country),
      genres: genres.map((name, index) => ({ id: index + 1, name })),
      availabilityStatus: 'available',
      isPlayable: true,
      unavailableReason: null,
      externalPlayer: {
        provider: 'vibix',
        lookupType: mediaType,
        lookupId: String(id),
        mediaType,
      },
      source: 'vibix',
    };
  }

  private toStringList(value: string[] | string | null | undefined): string[] {
    if (Array.isArray(value)) {
      return value
        .map(String)
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private toFormUrlEncoded(payload: Record<string, unknown>): string {
    const params = new URLSearchParams();
    const append = (key: string, value: unknown): void => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => append(`${key}[${index}]`, item));
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([childKey, childValue]) =>
          append(`${key}[${childKey}]`, childValue),
        );
        return;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params.append(key, String(value));
      }
    };

    Object.entries(payload).forEach(([key, value]) => append(key, value));
    return params.toString();
  }

  private normalizeImageUrl(value: unknown): string | null {
    const url = this.toNullableString(value);
    if (!url) return null;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://vibix.org${url}`;
    return url;
  }

  private firstString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }
}
