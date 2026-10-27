import { Injectable } from '@nestjs/common';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';
import { VideoseedService } from '@/external-api/videoseed/application/videoseed.service';
import { KodikCatalogService } from '@/external-api/kodik/application/kodik-catalog.service';
import { PlaybackSettingsRepository } from '@/playback-settings/infrastructure/playback-settings.repository';
import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';
import { VideoseedItem } from '@/external-api/videoseed/domain/videoseed.types';

export type ExternalBanner = {
  id: number;
  imageUrl: string;
  imageCandidates: string[];
  linkUrl: string;
  title: string;
  source: 'vibix' | 'videoseed' | 'kodik';
  openInNewTab: boolean;
};

const CACHE_MS = 5 * 60_000;
const safeImageUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    // Verified missing-image asset returned for the Zootopia 2 backdrop: HTTP 200, grey K logo.
    if (
      url.hostname === 'avatars.mds.yandex.net' &&
      url.pathname.includes('/2a0000019ac9a31de3b4565f65a725a0fdd3/')
    )
      return false;
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

const bannerId = (key: string): number => {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return -1 - (hash % 2_147_483_646);
};

/** Metadata only. Image sizes are checked in the browser; no remote image fetch/SSRF here. */
@Injectable()
export class ExternalBannerService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: Promise<ExternalBanner[]> }
  >();

  constructor(
    private readonly configs: ExternalApiConfigService,
    private readonly playback: PlaybackSettingsRepository,
    private readonly vibix: VibixCatalogService,
    private readonly videoseed: VideoseedService,
    private readonly kodik: KodikCatalogService,
  ) {}

  async getCandidates(): Promise<ExternalBanner[]> {
    const { provider } = await this.playback.getOrCreateDefault();
    const cached = this.cache.get(provider);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = this.load(provider).catch(() => []);
    this.cache.set(provider, { expiresAt: Date.now() + CACHE_MS, value });
    return value;
  }

  private async enabled(provider: ExternalApiProviderEnum): Promise<boolean> {
    const configs = await this.configs.getActiveConfigs(provider, ExternalApiTargetEnum.BACK);
    return configs.some(config => Boolean(config.token?.trim()));
  }

  private candidate(
    source: ExternalBanner['source'],
    title: string,
    linkUrl: string,
    images: unknown[],
  ): ExternalBanner | null {
    const imageCandidates = [...new Set(images.filter(safeImageUrl))].slice(0, 3);
    if (!title || imageCandidates.length === 0) return null;
    return {
      id: bannerId(linkUrl),
      source,
      title,
      linkUrl,
      imageUrl: imageCandidates[0],
      imageCandidates,
      openInNewTab: false,
    };
  }

  private videoseedCandidate(item: VideoseedItem): ExternalBanner | null {
    const animated = item.genres.some(genre => /мультфильм|аниме|анимация|animation/i.test(genre));
    const type = animated ? 'cartoons' : item.kind === 'serial' ? 'serials' : 'films';
    return this.candidate(
      'videoseed',
      item.name,
      `/detail/${encodeURIComponent(item.id)}?type=${type}&source=videoseed`,
      [...(item.bannerUrls ?? []), item.posterUrl],
    );
  }

  private async load(provider: PlaybackProvider): Promise<ExternalBanner[]> {
    const [hasVibix, hasVideoseed, hasKodik] = await Promise.all([
      this.enabled(ExternalApiProviderEnum.VIBIX),
      this.enabled(ExternalApiProviderEnum.VIDEOSEED),
      this.enabled(ExternalApiProviderEnum.KODIK),
    ]);
    const top =
      provider === PlaybackProvider.VIBIX && hasVibix
        ? await this.vibix.getTopRecent(10).catch(() => [])
        : [];
    const vibix = top
      .slice(0, 6)
      .map(item =>
        this.candidate('vibix', item.name, `/detail/${item.id}?type=${item.mediaType}`, [
          item.backgroundImg,
          item.content.backgroundUrl,
          item.previewUrl,
        ]),
      );
    const [seed, kodik] = await Promise.all([
      provider === PlaybackProvider.VIBIX && hasVideoseed
        ? this.loadVideoseed(top)
        : Promise.resolve([]),
      hasKodik ? this.loadKodik() : Promise.resolve([]),
    ]);
    const lists = [vibix, seed, kodik];
    const result: ExternalBanner[] = [];
    const seen = new Set<string>();
    // Mix providers instead of allowing one catalogue to occupy the entire carousel.
    for (let index = 0; index < 6 && result.length < 9; index += 1) {
      for (const list of lists) {
        const banner = list[index];
        if (!banner || result.length >= 9 || seen.has(banner.imageUrl) || seen.has(banner.linkUrl))
          continue;
        seen.add(banner.imageUrl);
        seen.add(banner.linkUrl);
        result.push(banner);
      }
    }
    return result;
  }

  private async loadVideoseed(
    top: Awaited<ReturnType<VibixCatalogService['getTopRecent']>>,
  ): Promise<Array<ExternalBanner | null>> {
    const matches = await Promise.all(
      top
        .slice(0, 4)
        .map(item =>
          this.videoseed
            .findByIds(
              { kp: item.details.kpId, imdb: item.details.imdbId },
              item.externalPlayer?.mediaType === 'series' ? 'serial' : 'movie',
            )
            .catch(() => null),
        ),
    );
    let banners = matches
      .filter((item): item is VideoseedItem => item !== null)
      .map(item => this.videoseedCandidate(item))
      .filter(Boolean);
    if (banners.length === 0) {
      const recent = await this.videoseed.getRecent('serial').catch(() => []);
      const detailed = await Promise.all(
        recent.slice(0, 3).map(item => this.videoseed.getById(item.id, 'serial').catch(() => null)),
      );
      banners = detailed
        .filter((item): item is VideoseedItem => item !== null)
        .map(item => this.videoseedCandidate(item))
        .filter(Boolean);
    }
    return banners;
  }

  private async loadKodik(): Promise<Array<ExternalBanner | null>> {
    const pages = await Promise.all(
      (['anime', 'dramas'] as const).map(section =>
        this.kodik.getPage(section).catch(() => ({ items: [] })),
      ),
    );
    return pages.flatMap(page =>
      page.items
        .slice(0, 2)
        .map(item =>
          this.candidate(
            'kodik',
            item.title,
            `/kodik/${item.section}/${encodeURIComponent(item.id)}`,
            [item.backdropUrl],
          ),
        ),
    );
  }
}
