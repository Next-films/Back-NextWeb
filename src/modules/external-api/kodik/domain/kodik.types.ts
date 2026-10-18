export type KodikSection = 'anime' | 'dramas';

export interface KodikTranslation {
  id?: number | string | null;
  title?: string | null;
  type?: string | null;
}

export interface KodikMaterialData {
  title?: string | null;
  anime_title?: string | null;
  drama_title?: string | null;
  title_en?: string | null;
  other_titles?: string[] | null;
  description?: string | null;
  anime_description?: string | null;
  poster_url?: string | null;
  anime_poster_url?: string | null;
  drama_poster_url?: string | null;
  genres?: string[] | null;
  anime_genres?: string[] | null;
  drama_genres?: string[] | null;
  countries?: string[] | null;
  duration?: number | string | null;
  kinopoisk_rating?: number | string | null;
  imdb_rating?: number | string | null;
  shikimori_rating?: number | string | null;
  mydramalist_rating?: number | string | null;
}

export interface KodikRecord {
  id?: string | null;
  type?: string | null;
  link?: string | null;
  title?: string | null;
  title_orig?: string | null;
  other_title?: string | null;
  year?: number | string | null;
  kinopoisk_id?: string | number | null;
  imdb_id?: string | null;
  shikimori_id?: string | number | null;
  mdl_id?: string | number | null;
  quality?: string | null;
  screenshots?: string[] | null;
  translation?: KodikTranslation | null;
  last_season?: number | string | null;
  last_episode?: number | string | null;
  episodes_count?: number | string | null;
  material_data?: KodikMaterialData | null;
}

export interface KodikResponse {
  results?: KodikRecord[];
  next_page?: string | null;
  total?: number | string | null;
  error?: string | null;
}

export interface KodikPublicItem {
  id: string;
  section: KodikSection;
  title: string;
  originalTitle: string | null;
  description: string;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  countries: string[];
  duration: number | null;
  quality: string | null;
  rating: number | null;
  translation: string | null;
  seasonsCount: number | null;
  episodesCount: number | null;
  isSerial: boolean;
  player: { provider: 'kodik'; iframeUrl: string };
}
