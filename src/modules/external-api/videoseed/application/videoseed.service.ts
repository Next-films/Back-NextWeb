import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import {
  VideoseedSeason,
  VideoseedSeasonRecord,
  VideoseedItem,
  VideoseedKind,
  VideoseedLookup,
  VideoseedRecord,
  VideoseedResponse,
} from '@/external-api/videoseed/domain/videoseed.types';

const DEFAULT_BASE_URL = 'https://api.videoseed.tv/apiv2.php';
const REQUEST_TIMEOUT_MS = 10_000;
// У Videoseed дневной лимит запросов (5000), поэтому ответы, включая
// «не найдено», кэшируются: карточку открывают многократно.
const FOUND_TTL_MS = 6 * 60 * 60 * 1000;
const MISSING_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

/* Второй CDN-плеер. Используется как запасной к Vibix: ищет ту же запись
   по id Кинопоиска / IMDb / TMDB и отдаёт iframe и недостающие данные. */
@Injectable()
export class VideoseedService {
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(VideoseedService.name);
  }

  async findByIds(ids: VideoseedLookup, kind: VideoseedKind): Promise<VideoseedItem | null> {
    const lookups = [
      ['kp', ids.kp],
      ['imdb', ids.imdb],
      ['tmdb', ids.tmdb],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));

    for (const [key, value] of lookups) {
      const [item] = await this.request(kind, { [key]: value.trim() });
      if (item) return item;
    }
    return null;
  }

  async getById(id: string, kind: VideoseedKind): Promise<VideoseedItem | null> {
    const [item] = await this.request(kind, { id });
    return item ?? null;
  }

  search(query: string, kind: VideoseedKind): Promise<VideoseedItem[]> {
    const q = query.trim();
    return q ? this.request(kind, { q }) : Promise.resolve([]);
  }

  private async request(
    kind: VideoseedKind,
    params: Record<string, string>,
  ): Promise<VideoseedItem[]> {
    const cacheKey = `${kind}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as VideoseedItem[];

    const config = await this.externalApiConfigService.getActiveConfig(
      ExternalApiProviderEnum.VIDEOSEED,
      ExternalApiTargetEnum.BACK,
    );
    const token = config?.token?.split(',')[0]?.trim();
    if (!token) return [];

    let items: VideoseedItem[] = [];
    try {
      const response = await this.httpService.axiosRef.get<VideoseedResponse>(
        config?.baseUrl?.trim() || DEFAULT_BASE_URL,
        { params: { item: kind, token, ...params }, timeout: REQUEST_TIMEOUT_MS },
      );
      const data = response.data?.status === 'success' ? response.data.data : [];
      items = (Array.isArray(data) ? data : [])
        .map(record => this.toItem(record, kind))
        .filter((item): item is VideoseedItem => item !== null);
    } catch (error) {
      // Сбой запасного плеера не должен ломать карточку Vibix — просто без него.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(message, this.request.name);
      return [];
    }

    this.remember(cacheKey, items, items.length > 0 ? FOUND_TTL_MS : MISSING_TTL_MS);
    return items;
  }

  private remember(key: string, value: unknown, ttl: number) {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  private toItem(record: VideoseedRecord, kind: VideoseedKind): VideoseedItem | null {
    const id = String(record.id ?? '').trim();
    const iframeUrl = typeof record.iframe === 'string' ? record.iframe.trim() : '';
    if (!/^\d+$/.test(id) || !iframeUrl.startsWith('https://')) return null;

    const year = Number(record.year);
    const [hours, minutes] = String(record.time ?? '')
      .split(':')
      .map(Number);
    const seasons = record.seasons && typeof record.seasons === 'object' ? record.seasons : null;

    return {
      id,
      kind,
      iframeUrl,
      name: this.text(record.name),
      originalName: this.text(record.original_name),
      year: Number.isInteger(year) && year > 1800 ? year : null,
      description: this.text(record.description),
      posterUrl: this.text(record.poster) || null,
      // Жанр «Сериалы» у Videoseed — это тип, а не жанр.
      genres: this.list(record.genre).filter(genre => genre.toLowerCase() !== 'сериалы'),
      countries: this.list(record.country),
      actors: this.list(record.actor),
      directors: this.list(record.director),
      durationMinutes: kind === 'movie' && Number.isFinite(hours) ? hours * 60 + (minutes || 0) : 0,
      kpId: this.text(String(record.id_kp ?? '')) || null,
      imdbId: this.text(record.id_imdb) || null,
      seasonsCount: seasons ? Object.keys(seasons).length || null : null,
      seasons: seasons ? this.toSeasons(seasons) : [],
    };
  }

  // seasons: { "1": { videos: { "8": { iframe: ".../embed/591311/?token=…" } } } }
  // У каждой серии свой iframe — плеер открывается сразу на ней.
  private toSeasons(seasons: Record<string, VideoseedSeasonRecord>): VideoseedSeason[] {
    return Object.entries(seasons)
      .map(([seasonKey, season]) => ({
        number: Number(seasonKey),
        episodes: Object.entries(season?.videos ?? {})
          .map(([episodeKey, episode]) => ({
            number: Number(episodeKey),
            title: null,
            iframeUrl: this.text(episode?.iframe),
            previewUrl: this.text(episode?.preview) || null,
          }))
          .filter(
            episode =>
              Number.isInteger(episode.number) &&
              episode.number > 0 &&
              episode.iframeUrl.startsWith('https://'),
          )
          .sort((left, right) => left.number - right.number),
      }))
      .filter(season => Number.isInteger(season.number) && season.number > 0)
      .filter(season => season.episodes.length > 0)
      .sort((left, right) => left.number - right.number);
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private list(value: unknown): string[] {
    return this.text(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
}
