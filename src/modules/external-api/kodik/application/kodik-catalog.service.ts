import { HttpService } from '@nestjs/axios';
import { canPublishCountries } from '@/common/utils/public-content-policy';
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
  KodikPublicItem,
  KodikRecord,
  KodikResponse,
  KodikSection,
} from '@/external-api/kodik/domain/kodik.types';

const REQUEST_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 24;
const CACHE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class KodikCatalogService {
  private readonly cache = new Map<string, { value: Promise<unknown>; expiresAt: number }>();

  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly configService: ExternalApiConfigService,
  ) {
    this.logger.setContext(KodikCatalogService.name);
  }

  getPage(section: KodikSection, cursor?: string, search?: string) {
    const safeCursor = this.normalizeCursor(cursor);
    const query = search?.trim().slice(0, 120) || '';
    return this.cached(`page:${section}:${safeCursor}:${query}`, () =>
      this.loadPage(section, safeCursor, query),
    );
  }

  getById(section: KodikSection, id: string): Promise<KodikPublicItem> {
    if (!/^(movie|serial)-[a-z0-9]+$/i.test(id)) {
      throw new NotFoundException('Kodik title was not found');
    }
    return this.cached(`item:${section}:${id}`, async () => {
      const response = await this.request('/search', {
        id,
        with_material_data: 'true',
        not_blocked_for_me: 'true',
      });
      const record = (response.results ?? []).find(item => item.id === id);
      if (!record) throw new NotFoundException('Kodik title was not found');
      const item = this.toPublicItem(record, section);
      if (!canPublishCountries(item.countries)) throw new NotFoundException('Content not found');
      return item;
    });
  }

  private async loadPage(section: KodikSection, cursor: string, search: string) {
    const response = await this.request(search ? '/search' : '/list', {
      types:
        section === 'anime' ? 'anime,anime-serial' : 'foreign-movie,foreign-serial,multi-part-film',
      ...(section === 'dramas' ? { has_field: 'mdl_id' } : {}),
      ...(search ? { title: search } : {}),
      ...(cursor ? { next: cursor } : {}),
      with_material_data: 'true',
      not_blocked_for_me: 'true',
      limit: String(PAGE_SIZE),
    });
    const items = this.deduplicate(response.results ?? [], section).filter(item =>
      canPublishCountries(item.countries),
    );
    return {
      items,
      nextCursor: this.extractCursor(response.next_page),
      total: this.toPositiveNumber(response.total),
    };
  }

  private deduplicate(records: KodikRecord[], section: KodikSection): KodikPublicItem[] {
    const selected = new Map<string, KodikRecord>();
    for (const record of records) {
      if (!record.id || !record.link) continue;
      const key = String(
        section === 'anime'
          ? record.shikimori_id ?? record.kinopoisk_id ?? record.title ?? record.id
          : record.mdl_id ?? record.kinopoisk_id ?? record.title ?? record.id,
      ).toLowerCase();
      const current = selected.get(key);
      if (!current || this.translationScore(record) > this.translationScore(current)) {
        selected.set(key, record);
      }
    }
    return [...selected.values()].map(record => this.toPublicItem(record, section));
  }

  private translationScore(record: KodikRecord) {
    const type = record.translation?.type?.toLowerCase() ?? '';
    const voiced = type.includes('voice') || type.includes('озвуч');
    return (voiced ? 100_000 : 0) + (this.toPositiveNumber(record.episodes_count) ?? 0);
  }

  private toPublicItem(record: KodikRecord, section: KodikSection): KodikPublicItem {
    const material = record.material_data ?? {};
    const year = this.toPositiveNumber(record.year);
    const poster = this.normalizeHttpUrl(
      material.poster_url ?? material.anime_poster_url ?? material.drama_poster_url,
    );
    const backdrop = this.normalizeHttpUrl(record.screenshots?.[0]);
    const rating = this.toNumber(
      section === 'anime'
        ? material.shikimori_rating ?? material.kinopoisk_rating ?? material.imdb_rating
        : material.mydramalist_rating ?? material.kinopoisk_rating ?? material.imdb_rating,
    );
    return {
      id: String(record.id),
      section,
      title: this.firstString(
        material.title,
        material.anime_title,
        material.drama_title,
        record.title,
      ),
      originalTitle: this.nullableString(record.title_orig, material.title_en, record.other_title),
      description: this.firstString(material.description, material.anime_description),
      year,
      posterUrl: poster ?? backdrop,
      backdropUrl: backdrop ?? poster,
      genres: this.stringList(material.genres ?? material.anime_genres ?? material.drama_genres),
      countries: this.stringList(material.countries),
      duration: this.toPositiveNumber(material.duration),
      quality: this.nullableString(record.quality),
      rating,
      translation: this.nullableString(record.translation?.title),
      seasonsCount: this.toPositiveNumber(record.last_season),
      episodesCount: this.toPositiveNumber(record.episodes_count ?? record.last_episode),
      isSerial: String(record.type).includes('serial'),
      player: { provider: 'kodik', iframeUrl: this.normalizePlayerUrl(record.link) },
    };
  }

  private async request(path: string, params: Record<string, string>): Promise<KodikResponse> {
    const config = await this.configService.getActiveConfig(
      ExternalApiProviderEnum.KODIK,
      ExternalApiTargetEnum.BACK,
    );
    const token = config?.token?.trim();
    if (!config?.baseUrl?.trim() || !token) {
      throw new ServiceUnavailableException(
        'Kodik API is not configured. Add an enabled Kodik config for Backend.',
      );
    }
    const url = `${config.baseUrl.replace(/\/+$/, '')}${path}`;
    try {
      const response = await this.httpService.axiosRef.get<KodikResponse>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Accept: 'application/json' },
        params: { token, ...params },
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`${path}: ${message}`, this.request.name);
      throw new BadGatewayException('Kodik catalog is temporarily unavailable');
    }
  }

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
    const value = load();
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    value.catch(() => this.cache.get(key)?.value === value && this.cache.delete(key));
    return value;
  }

  private normalizeCursor(value?: string): string {
    const cursor = value?.trim() ?? '';
    return /^[a-z0-9._~=-]{1,512}$/i.test(cursor) ? cursor : '';
  }

  private extractCursor(nextPage?: string | null): string | null {
    if (!nextPage) return null;
    try {
      return (
        this.normalizeCursor(
          new URL(nextPage, 'https://kodik-api.com').searchParams.get('next') ?? '',
        ) || null
      );
    } catch {
      return null;
    }
  }

  private normalizePlayerUrl(value?: string | null): string {
    const normalized = this.normalizeHttpUrl(value);
    if (!normalized) throw new BadGatewayException('Kodik returned an invalid player URL');
    const hostname = new URL(normalized).hostname.toLowerCase();
    const allowedHosts = ['kodik.info', 'kodik.cc', 'kodik.biz', 'kodikplayer.com'];
    if (!allowedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
      throw new BadGatewayException('Kodik returned an invalid player host');
    }
    return normalized;
  }

  private normalizeHttpUrl(value?: string | null): string | null {
    if (!value?.trim()) return null;
    try {
      const url = new URL(value.startsWith('//') ? `https:${value}` : value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  }

  private firstString(...values: Array<string | null | undefined>): string {
    return this.nullableString(...values) ?? 'Без названия';
  }

  private nullableString(...values: Array<string | null | undefined>): string | null {
    return values.map(value => value?.trim()).find(Boolean) ?? null;
  }

  private stringList(value?: string[] | null): string[] {
    return Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : [];
  }

  private toNumber(value: unknown): number | null {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private toPositiveNumber(value: unknown): number | null {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }
}
