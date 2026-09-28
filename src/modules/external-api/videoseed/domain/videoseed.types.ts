export type VideoseedKind = 'movie' | 'serial';

export interface VideoseedRecord {
  id?: string | number | null;
  name?: string | null;
  original_name?: string | null;
  year?: string | number | null;
  id_kp?: string | number | null;
  id_imdb?: string | null;
  id_tmdb?: string | number | null;
  poster?: string | null;
  description?: string | null;
  genre?: string | null;
  country?: string | null;
  actor?: string | null;
  director?: string | null;
  type?: string | null;
  iframe?: string | null;
  time?: string | null;
  seasons?: Record<string, VideoseedSeasonRecord> | null;
}

export interface VideoseedSeasonRecord {
  name?: string;
  iframe?: string;
  videos?: Record<string, { name?: string; iframe?: string; preview?: string }> | null;
}

export interface VideoseedSeason {
  number: number;
  episodes: Array<{
    number: number;
    title: string | null;
    iframeUrl: string;
    previewUrl: string | null;
  }>;
}

export interface VideoseedResponse {
  status?: string;
  data?: VideoseedRecord[] | string;
  error_info?: string;
}

/** Нормализованная запись Videoseed, общая для обогащения Vibix и поиска. */
export interface VideoseedItem {
  id: string;
  kind: VideoseedKind;
  iframeUrl: string;
  name: string;
  originalName: string;
  year: number | null;
  description: string;
  posterUrl: string | null;
  genres: string[];
  countries: string[];
  actors: string[];
  directors: string[];
  durationMinutes: number;
  kpId: string | null;
  imdbId: string | null;
  seasonsCount: number | null;
  seasons: VideoseedSeason[];
}

export interface VideoseedLookup {
  kp?: string | null;
  imdb?: string | null;
  tmdb?: string | null;
}
