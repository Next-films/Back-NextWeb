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
  seasons?: Record<string, { name?: string; iframe?: string }> | null;
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
}

export interface VideoseedLookup {
  kp?: string | null;
  imdb?: string | null;
  tmdb?: string | null;
}
