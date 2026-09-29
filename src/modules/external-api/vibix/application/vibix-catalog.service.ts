import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { LoggerService } from '@/common/utils/logger/logger.service';
import { VideoseedService } from '@/external-api/videoseed/application/videoseed.service';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import {
  VibixCatalogResponse,
  VibixDetails,
  VibixGenre,
  VibixGenreCatalogue,
  VibixSeason,
  VibixMediaType,
  VibixPerson,
  VibixSort,
  VibixPublicItem,
  VibixVideoRecord,
} from '@/external-api/vibix/domain/vibix.types';

const VIBIX_REQUEST_TIMEOUT_MS = 25_000;
const MAX_PAGE_SIZE = 150;
const ANIMATION_GENRES = ['мультфильм', 'анимация', 'аниме', 'animation'];
const FILTERS_CACHE_TTL_MS = 60 * 60 * 1000;
// Каталог Vibix меняется редко, а запрос страницы идёт ~1 с и упирается
// в их rate limit — держим ответы в памяти.
const PAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const ITEM_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;

@Injectable()
export class VibixCatalogService {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly externalApiConfigService: ExternalApiConfigService,
    private readonly videoseedService: VideoseedService,
  ) {
    this.logger.setContext(VibixCatalogService.name);
  }

  private genreCatalogueCache: {
    value: VibixGenreCatalogue | null;
    expiresAt: number;
  } | null = null;

  private readonly responseCache = new Map<
    string,
    { value: Promise<unknown>; expiresAt: number }
  >();

  getPage(
    mediaType: VibixMediaType,
    page: number,
    search?: string,
    sort: VibixSort = 'new',
    genre?: string,
  ) {
    const safePage = Math.max(1, Math.floor(page));
    const key = `page:${mediaType}:${sort}:${genre ?? ''}:${safePage}:${search?.trim() ?? ''}`;
    return this.cached(key, PAGE_CACHE_TTL_MS, () =>
      this.loadPage(mediaType, page, search, sort, genre),
    );
  }

  getById(id: number): Promise<VibixPublicItem> {
    return this.cached(`item:${id}`, ITEM_CACHE_TTL_MS, () => this.loadById(id));
  }

  /* В кэше лежит сам промис: одновременные запросы одной страницы делят
     один поход в Vibix. Ошибки не кэшируются — следующий запрос повторит. */
  private cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    const hit = this.responseCache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;

    const value = load();
    if (this.responseCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.responseCache.keys().next().value;
      if (oldest !== undefined) this.responseCache.delete(oldest);
    }
    this.responseCache.set(key, { value, expiresAt: Date.now() + ttl });
    value.catch(() => {
      if (this.responseCache.get(key)?.value === value) this.responseCache.delete(key);
    });
    return value;
  }

  /* Страница — это ровно одно окно Vibix из MAX_PAGE_SIZE записей: её нельзя
     обрезать до меньшего размера, иначе следующая страница начнётся с
     MAX_PAGE_SIZE и всё между ними потеряется. */
  private async loadPage(
    mediaType: VibixMediaType,
    page: number,
    search?: string,
    sort: VibixSort = 'new',
    genre?: string,
  ) {
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
      // Vibix сортирует по columns[order.column].data: по году (новые первыми)
      // или по числу оценок Кинопоиска (популярные первыми).
      columns: [
        {
          data: sort === 'popular' ? 'kp_votes' : 'year',
          name: '',
          searchable: true,
          orderable: true,
        },
      ],
      order: [{ column: 0, dir: 'desc' }],
      filter: {
        type: apiTypes,
        activity: [1],
        ...(await this.getGenreFilter(mediaType, genre)),
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

  private async loadById(id: number): Promise<VibixPublicItem> {
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
    return this.withVideoseed(this.toPublicItem(record));
  }

  /* Карточка Vibix + запасной плеер Videoseed и то, чего нет у Vibix
     (описание, актёры, режиссёр). Только для карточки — не для списков,
     чтобы не расходовать дневной лимит Videoseed. */
  private async withVideoseed(item: VibixPublicItem): Promise<VibixPublicItem> {
    const fallback = await this.videoseedService.findByIds(
      { kp: item.details.kpId, imdb: item.details.imdbId },
      item.externalPlayer?.mediaType === 'series' ? 'serial' : 'movie',
    );
    if (!fallback) return item;

    return {
      ...item,
      name: this.preferRussian(item.name, fallback.name),
      description: this.preferRussian(item.description, fallback.description),
      country: item.country.length > 0 ? item.country : fallback.countries,
      isPlayable: true,
      fallbackPlayer: { provider: 'videoseed', iframeUrl: fallback.iframeUrl },
      details: {
        ...item.details,
        seasons: this.mergeSeasons(item.details.seasons, fallback.seasons),
        seasonsCount: item.details.seasonsCount ?? (fallback.seasons.length || null),
        actors: item.details.actors.length > 0 ? item.details.actors : fallback.actors.slice(0, 20),
        directors: item.details.directors.length > 0 ? item.details.directors : fallback.directors,
      },
    };
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
  /* Справочник жанров из getFilters (кэш на час): ключ фильтра жанров и его
     значения. Ключ находим по наличию известных жанров — имя поля Vibix
     не документировано. */
  private async getGenreCatalogue(): Promise<VibixGenreCatalogue | null> {
    if (this.genreCatalogueCache && this.genreCatalogueCache.expiresAt > Date.now()) {
      return this.genreCatalogueCache.value;
    }
    let value: VibixGenreCatalogue | null = null;
    try {
      const response = await this.requestApi<{
        error?: string;
        filters?: Record<
          string,
          {
            list?: Array<{
              name?: string | number | null;
              value?: string | number | null;
              count?: string | number | null;
            }>;
          }
        >;
      }>('/publisher/catalog/getFilters', {});
      const filters = Object.entries(response.filters ?? {}).map(([key, filter]) => ({
        key,
        items: (filter?.list ?? [])
          .map(item => ({
            name: String(item?.name ?? '').trim(),
            value: String(item?.value ?? '').trim(),
            count: Number(item?.count) || 0,
          }))
          .filter(item => item.name && item.value),
      }));
      const has = (items: Array<{ name: string }>, name: string) =>
        items.some(item => item.name.toLowerCase() === name);
      const animationOf = (items: Array<{ name: string; value: string }>) =>
        items
          .filter(item => ANIMATION_GENRES.includes(item.name.toLowerCase()))
          .map(item => item.value);

      // Жанровый фильтр узнаём по обычным жанрам: в других справочниках
      // (категории, теги) тоже встречается «аниме», но нет драмы и комедии.
      const genre = filters.find(
        filter => has(filter.items, 'драма') && has(filter.items, 'комедия'),
      );
      const animationSource =
        (genre && animationOf(genre.items).length > 0 ? genre : null) ??
        filters.find(filter => animationOf(filter.items).length > 0);

      value = {
        genre: genre ? { key: genre.key, genres: genre.items } : null,
        animation: animationSource
          ? { key: animationSource.key, values: animationOf(animationSource.items) }
          : null,
      };
    } catch {
      value = null;
    }
    this.genreCatalogueCache = { value, expiresAt: Date.now() + FILTERS_CACHE_TTL_MS };
    return value;
  }

  /** Жанры для фильтра на сайте: самые наполненные первыми. */
  async getGenres(): Promise<VibixGenre[]> {
    const catalogue = await this.getGenreCatalogue();
    return (catalogue?.genre?.genres ?? [])
      .filter(genre => !ANIMATION_GENRES.includes(genre.name.toLowerCase()))
      .sort((left, right) => right.count - left.count)
      .map(genre => ({
        name: genre.name.charAt(0).toUpperCase() + genre.name.slice(1),
        value: genre.value,
      }));
  }

  /* Фильтр запроса: выбранный жанр, а для мультфильмов — жанры анимации.
     Оба условия в одном поле Vibix объединяет через «или», поэтому при
     выбранном жанре анимацию для мультфильмов досеиваем уже после ответа. */
  private async getGenreFilter(
    mediaType: VibixMediaType,
    genre?: string,
  ): Promise<Record<string, string[]>> {
    if (!genre && mediaType !== 'cartoons') return {};
    const catalogue = await this.getGenreCatalogue();
    if (genre) return catalogue?.genre ? { [catalogue.genre.key]: [genre] } : {};
    return catalogue?.animation ? { [catalogue.animation.key]: catalogue.animation.values } : {};
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
      fallbackPlayer: null,
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
      episodesCount: seasons.reduce((sum, season) => sum + season.episodes.length, 0) || null,
      seasons,
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

  /* episodes: { "1": [...серии], "2": [...] } или массив сезонов. Серия —
     число, строка или объект с номером/названием; берём что есть. */
  private toSeasons(value: VibixVideoRecord['episodes']): VibixSeason[] {
    if (!value || typeof value !== 'object') return [];
    const entries = Array.isArray(value)
      ? value.map((season, index) => [String(index + 1), season] as const)
      : Object.entries(value);
    return entries
      .map(([key, season], index) => {
        const list = Array.isArray(season)
          ? season
          : season && typeof season === 'object'
          ? Object.entries(season).map(([episodeKey, episode]) =>
              episode && typeof episode === 'object'
                ? { number: episodeKey, ...(episode as object) }
                : episodeKey,
            )
          : [];
        const seasonNumber = Number(key);
        return {
          number: Number.isInteger(seasonNumber) && seasonNumber > 0 ? seasonNumber : index + 1,
          episodes: list.map((episode, episodeIndex) => this.toEpisode(episode, episodeIndex)),
        };
      })
      .filter(season => season.episodes.length > 0)
      .sort((left, right) => left.number - right.number);
  }

  private toEpisode(value: unknown, index: number): VibixSeason['episodes'][number] {
    const fallback = index + 1;
    if (typeof value === 'number' || typeof value === 'string') {
      const number = Number(value);
      return { number: Number.isInteger(number) && number > 0 ? number : fallback, title: null };
    }
    const episode = (value ?? {}) as Record<string, unknown>;
    const number = Number(episode.episode ?? episode.number ?? episode.num);
    const title = this.firstString(episode.name_rus, episode.name, episode.title);
    return {
      number: Number.isInteger(number) && number > 0 ? number : fallback,
      title: title || null,
    };
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

  /* К сериям Vibix добавляем ссылки Videoseed на те же сезон/серию
     (для «Плеера 2»); если у Vibix список серий пуст — берём список Videoseed. */
  private mergeSeasons(vibix: VibixSeason[], videoseed: VibixSeason[]): VibixSeason[] {
    if (vibix.length === 0) return videoseed;
    return vibix.map(season => {
      const match = videoseed.find(item => item.number === season.number);
      if (!match) return season;
      return {
        ...season,
        episodes: season.episodes.map(episode => {
          const link = match.episodes.find(item => item.number === episode.number);
          return link
            ? { ...episode, iframeUrl: link.iframeUrl, previewUrl: link.previewUrl }
            : episode;
        }),
      };
    });
  }

  /* Русский текст важнее: если у Vibix пусто или не по-русски (часто английский),
     а у Videoseed есть русский вариант — берём его. Иначе оставляем Vibix. */
  private preferRussian(primary: string, fallback: string): string {
    const hasCyrillic = (value: string) => /[А-Яа-яЁё]/.test(value);
    if (hasCyrillic(primary)) return primary;
    if (hasCyrillic(fallback)) return fallback;
    return primary || fallback;
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
