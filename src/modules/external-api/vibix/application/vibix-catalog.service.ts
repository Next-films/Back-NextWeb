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
  VibixDetails,
  VibixMediaType,
  VibixPerson,
  VibixPublicItem,
  VibixVideoRecord,
} from '@/external-api/vibix/domain/vibix.types';

const VIBIX_REQUEST_TIMEOUT_MS = 25_000;
const MAX_PAGE_SIZE = 150;
const ANIMATION_GENRES = ['мультфильм', 'анимация', 'аниме', 'animation'];
const FILTERS_CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class VibixCatalogService {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly externalApiConfigService: ExternalApiConfigService,
  ) {
    this.logger.setContext(VibixCatalogService.name);
  }

  private animationFilterCache: {
    value: Record<string, string[]> | null;
    expiresAt: number;
  } | null = null;

  /* Страница — это ровно одно окно Vibix из MAX_PAGE_SIZE записей: её нельзя
     обрезать до меньшего размера, иначе следующая страница начнётся с
     MAX_PAGE_SIZE и всё между ними потеряется. */
  async getPage(mediaType: VibixMediaType, page: number, search?: string) {
    const safePage = Math.max(1, Math.floor(page));
    const apiTypes =
      mediaType === 'films'
        ? ['movie']
        : mediaType === 'serials'
        ? ['serial']
        : ['movie', 'serial'];
    const response = await this.requestCatalog({
      draw: safePage,
      start: (safePage - 1) * MAX_PAGE_SIZE,
      length: MAX_PAGE_SIZE,
      // Vibix сортирует по columns[order.column].data: новые по году — первыми.
      columns: [{ data: 'year', name: '', searchable: true, orderable: true }],
      order: [{ column: 0, dir: 'desc' }],
      filter: {
        type: apiTypes,
        activity: [1],
        ...(mediaType === 'cartoons' ? await this.getAnimationFilter() : {}),
      },
      ...(search?.trim() ? { search: { value: search.trim() } } : {}),
    });

    const items = this.getRecords(response)
      .filter(record => this.matchesType(record, mediaType))
      .map(record => this.toPublicItem(record))
      // Без кода плеера запись в Vibix ещё не загружена — смотреть нечего.
      .filter(item => Boolean(item.externalPlayer))
      .filter(item => Boolean(item.previewUrl || item.backgroundImg));
    const total = this.getTotal(response);

    return {
      items,
      pagesCount: Math.ceil(total / MAX_PAGE_SIZE),
      totalCount: total,
    };
  }

  async getById(id: number): Promise<VibixPublicItem> {
    const response = await this.requestCatalog({
      draw: 1,
      start: 0,
      // С length=1 Vibix отвечал ошибкой (502 на каждую деталь); шлём тот же размер, что и в списке.
      length: MAX_PAGE_SIZE,
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

  /* Мультфильмов в Vibix нет отдельным типом. Без фильтра по жанру на стороне
     Vibix в окно из 150 новинок попадает 1–3 мультфильма, поэтому берём
     значения жанров-анимации из справочника getFilters и фильтруем в запросе.
     Справочник недоступен — остаётся фильтрация по жанру уже после загрузки. */
  private async getAnimationFilter(): Promise<Record<string, string[]>> {
    if (this.animationFilterCache && this.animationFilterCache.expiresAt > Date.now()) {
      return this.animationFilterCache.value ?? {};
    }
    let value: Record<string, string[]> | null = null;
    try {
      const response = await this.requestApi<{
        error?: string;
        filters?: Record<
          string,
          { list?: Array<{ name?: string | number | null; value?: string | number | null }> }
        >;
      }>('/publisher/catalog/getFilters', {});
      for (const [key, filter] of Object.entries(response.filters ?? {})) {
        const values = (filter?.list ?? [])
          .filter(item =>
            ANIMATION_GENRES.includes(
              String(item?.name ?? '')
                .trim()
                .toLowerCase(),
            ),
          )
          .map(item => String(item?.value ?? '').trim())
          .filter(Boolean);
        if (values.length > 0) {
          value = { [key]: values };
          break;
        }
      }
    } catch {
      value = null;
    }
    this.animationFilterCache = { value, expiresAt: Date.now() + FILTERS_CACHE_TTL_MS };
    return value ?? {};
  }

  private requestCatalog(payload: Record<string, unknown>): Promise<VibixCatalogResponse> {
    return this.requestApi<VibixCatalogResponse>('/publisher/catalog/data', payload);
  }

  private async requestApi<T extends { error?: string }>(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
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

    const url = `${config.baseUrl.replace(/\/+$/, '')}${path}`;
    try {
      const response = await this.httpService.axiosRef.post<T>(
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
      this.logger.error(`${path}: ${message}`, this.requestApi.name);
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
    const genres = this.toStringList(record.genre).map(value => value.toLowerCase());
    const isAnimated = genres.some(value =>
      ['мультфильм', 'анимация', 'аниме', 'animation'].includes(value.trim()),
    );
    if (mediaType === 'cartoons') return isAnimated;
    if (mediaType === 'serials') return isSerial && !isAnimated;
    return !isSerial && !isAnimated;
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
    const posterUrl = this.normalizeImageUrl(record.poster_url ?? record.preview ?? record.poster);
    const backdropUrl = this.normalizeImageUrl(
      record.backdrop_url ?? record.preview_backdrop ?? record.backdrop,
    );
    const previewUrl = posterUrl ?? backdropUrl;
    const externalPlayer = this.toExternalPlayer(record, mediaType);
    const backgroundUrl = backdropUrl ?? posterUrl;

    return {
      id,
      name: this.firstString(record.name_rus, record.name, record.name_eng, record.name_original),
      description: this.firstString(
        record.description_rus,
        record.description,
        record.description_short,
        record.description_eng,
      ),
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
      details: this.toDetails(record, Number.isInteger(year) && year > 1800 ? year : null),
      availabilityStatus: 'available',
      isPlayable: Boolean(externalPlayer),
      unavailableReason: null,
      externalPlayer,
      source: 'vibix',
    };
  }

  /* Плеер Vibix ищет видео по своему id из кода встраивания
     (embed_code_new: data-id="245936"), а не по id записи каталога.
     С id каталога плеер отвечает «контент ещё не добавлен». */
  private toExternalPlayer(
    record: VibixVideoRecord,
    fallbackType: 'movie' | 'series',
  ): VibixPublicItem['externalPlayer'] {
    const embed = typeof record.embed_code_new === 'string' ? record.embed_code_new : '';
    const embedId = /data-id="(\d+)"/.exec(embed)?.[1];
    const embedType = /data-type="(movie|series)"/.exec(embed)?.[1] as
      | 'movie'
      | 'series'
      | undefined;
    const iframeId = String(record.iframe_video_id ?? '').trim();
    const lookupId = embedId ?? (/^\d+$/.test(iframeId) ? iframeId : null);
    if (!lookupId) return null;
    const mediaType = embedType ?? fallbackType;
    return { provider: 'vibix', lookupType: mediaType, lookupId, mediaType };
  }

  private toDetails(record: VibixVideoRecord, year: number | null): VibixDetails {
    const persons = this.groupPersons(record.persons);
    const seasons = this.toSeasons(record.episodes);
    return {
      year,
      kpId: this.toNullableString(String(record.kp_id ?? record.kinopoisk_id ?? '')),
      imdbId: this.toNullableString(record.imdb_id),
      kpRating: this.toPositiveNumber(record.kp_rating),
      kpVotes: this.toPositiveNumber(record.kp_votes),
      imdbRating: this.toPositiveNumber(record.imdb_rating),
      imdbVotes: this.toPositiveNumber(record.imdb_votes),
      quality: this.toNullableString(record.quality),
      voiceovers: this.toNameList(record.voiceovers),
      directors: persons.director ?? [],
      writers: persons.writer ?? [],
      actors: (persons.actor ?? []).slice(0, 20),
      producers: (persons.producer ?? []).slice(0, 6),
      operators: persons.operator ?? [],
      composers: persons.composer ?? [],
      seasonsCount: seasons.length > 0 ? seasons.length : null,
      episodesCount:
        seasons.length > 0 ? seasons.reduce((sum, season) => sum + season, 0) || null : null,
    };
  }

  /* persons приходит либо списком с occupation, либо уже сгруппированным
     объектом { actor: [...], director: [...] } — плагин Vibix поддерживает оба. */
  private groupPersons(value: VibixVideoRecord['persons']): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    const add = (occupation: string, person: VibixPerson) => {
      const name = this.firstString(person?.name_anyway, person?.name);
      if (!occupation || !name) return;
      const names = (grouped[occupation] ??= []);
      if (!names.includes(name)) names.push(name);
    };
    if (Array.isArray(value)) {
      value.forEach(person => add(String(person?.occupation ?? ''), person));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([occupation, list]) => {
        if (Array.isArray(list)) list.forEach(person => add(occupation, person));
      });
    }
    return grouped;
  }

  // episodes: { "1": [...серии], "2": [...] } или массив сезонов.
  private toSeasons(value: VibixVideoRecord['episodes']): number[] {
    if (!value || typeof value !== 'object') return [];
    return Object.values(value).map(season =>
      Array.isArray(season)
        ? season.length
        : season && typeof season === 'object'
        ? Object.keys(season).length
        : 0,
    );
  }

  private toNameList(value: unknown): string[] {
    if (typeof value === 'string') return this.toStringList(value);
    if (!Array.isArray(value)) return [];
    return value
      .map(item =>
        typeof item === 'string'
          ? item.trim()
          : item && typeof item === 'object'
          ? this.firstString((item as { name?: unknown }).name)
          : '',
      )
      .filter(Boolean);
  }

  private toPositiveNumber(value: unknown): number | null {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
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
