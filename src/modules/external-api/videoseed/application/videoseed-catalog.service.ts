import { Injectable, NotFoundException } from '@nestjs/common';

import { VideoseedService } from '@/external-api/videoseed/application/videoseed.service';
import { VideoseedItem, VideoseedKind } from '@/external-api/videoseed/domain/videoseed.types';
import { VibixMediaType, VibixPublicItem } from '@/external-api/vibix/domain/vibix.types';

const ANIMATION_GENRES = ['мультфильм', 'мультфильмы', 'анимация', 'аниме'];

/* Записи Videoseed в том же формате, что и каталог Vibix, чтобы фронт
   показывал их теми же карточками. Нужны для контента, которого нет в Vibix. */
@Injectable()
export class VideoseedCatalogService {
  constructor(private readonly videoseedService: VideoseedService) {}

  async search(mediaType: VibixMediaType, query: string): Promise<VibixPublicItem[]> {
    const kinds: VideoseedKind[] =
      mediaType === 'films'
        ? ['movie']
        : mediaType === 'serials'
        ? ['serial']
        : ['movie', 'serial'];
    const results = await Promise.all(kinds.map(kind => this.videoseedService.search(query, kind)));
    return results
      .flat()
      .filter(item => this.matchesType(item, mediaType))
      .map(item => this.toPublicItem(item));
  }

  async getById(mediaType: VibixMediaType, id: string): Promise<VibixPublicItem> {
    const kinds: VideoseedKind[] =
      mediaType === 'films'
        ? ['movie']
        : mediaType === 'serials'
        ? ['serial']
        : ['movie', 'serial'];
    for (const kind of kinds) {
      const item = await this.videoseedService.getById(id, kind);
      if (item) return this.toPublicItem(item);
    }
    throw new NotFoundException('Videoseed content not found');
  }

  private matchesType(item: VideoseedItem, mediaType: VibixMediaType): boolean {
    const isAnimated = item.genres.some(genre =>
      ANIMATION_GENRES.includes(genre.trim().toLowerCase()),
    );
    if (mediaType === 'cartoons') return isAnimated;
    return !isAnimated;
  }

  private toPublicItem(item: VideoseedItem): VibixPublicItem {
    const isSeries = item.kind === 'serial';
    return {
      id: Number(item.id),
      name: item.name,
      description: item.description,
      duration: item.durationMinutes,
      releaseDate: item.year ? `${item.year}-01-01` : '',
      subTitle: item.originalName,
      studio: null,
      universe: null,
      previewUrl: item.posterUrl,
      cardImg: item.posterUrl,
      backgroundImg: item.posterUrl,
      content: {
        movieUrl: null,
        trailerUrl: null,
        backgroundUrl: item.posterUrl,
        previewUrl: item.posterUrl,
        titleUrl: null,
      },
      country: item.countries,
      genres: item.genres.map((name, index) => ({ id: index + 1, name })),
      details: {
        year: item.year,
        kpId: item.kpId,
        imdbId: item.imdbId,
        kpRating: null,
        kpVotes: null,
        imdbRating: null,
        imdbVotes: null,
        quality: null,
        voiceovers: [],
        directors: item.directors,
        writers: [],
        actors: item.actors.slice(0, 20),
        producers: [],
        operators: [],
        composers: [],
        seasonsCount: isSeries ? item.seasonsCount : null,
        episodesCount: null,
        seasons: [],
      },
      availabilityStatus: 'available',
      isPlayable: true,
      unavailableReason: null,
      externalPlayer: null,
      fallbackPlayer: { provider: 'videoseed', iframeUrl: item.iframeUrl },
      source: 'videoseed',
    };
  }
}
