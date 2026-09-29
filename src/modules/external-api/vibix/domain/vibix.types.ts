export type VibixMediaType = 'films' | 'serials' | 'cartoons';

/** new — сначала новые (по году), popular — по числу оценок Кинопоиска. */
export type VibixSort = 'new' | 'popular';

export interface VibixVideoRecord {
  id?: number | string | null;
  name?: string | null;
  name_rus?: string | null;
  name_eng?: string | null;
  name_original?: string | null;
  type?: string | null;
  year?: number | string | null;
  kp_id?: number | string | null;
  kinopoisk_id?: number | string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  preview?: string | null;
  preview_backdrop?: string | null;
  poster?: string | null;
  backdrop?: string | null;
  duration?: number | string | null;
  genre?: string[] | string | null;
  country?: string[] | string | null;
  description?: string | null;
  description_short?: string | null;
  description_rus?: string | null;
  description_eng?: string | null;
  embed_code_new?: string | null;
  iframe_video_id?: number | string | null;
  uploaded_at?: string | null;
  quality?: string | null;
  voiceovers?: unknown;
  persons?: VibixPerson[] | Record<string, VibixPerson[]> | null;
  episodes?: Record<string, unknown> | unknown[] | null;
  kp_rating?: number | string | null;
  kp_votes?: number | string | null;
  imdb_id?: string | null;
  imdb_rating?: number | string | null;
  imdb_votes?: number | string | null;
}

export interface VibixPerson {
  name_anyway?: string | null;
  name?: string | null;
  occupation?: string | null;
}

export interface VibixDetails {
  year: number | null;
  kpId: string | null;
  imdbId: string | null;
  kpRating: number | null;
  kpVotes: number | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  quality: string | null;
  voiceovers: string[];
  directors: string[];
  writers: string[];
  actors: string[];
  producers: string[];
  operators: string[];
  composers: string[];
  seasonsCount: number | null;
  episodesCount: number | null;
  seasons: VibixSeason[];
}

export interface VibixSeason {
  number: number;
  episodes: Array<{
    number: number;
    title: string | null;
    /** Ссылка на эту серию во втором плеере (Videoseed), если она там есть. */
    iframeUrl?: string;
    previewUrl?: string | null;
  }>;
}

export interface VibixCatalogResponse {
  data?: VibixVideoRecord[] | { items?: VibixVideoRecord[] };
  recordsTotal?: number | string;
  recordsFiltered?: number | string;
  error?: string;
}

export interface VibixPublicItem {
  id: number;
  name: string;
  description: string;
  duration: number;
  releaseDate: string;
  subTitle: string;
  studio: null;
  universe: null;
  previewUrl: string | null;
  cardImg: string | null;
  backgroundImg: string | null;
  content: {
    movieUrl: null;
    trailerUrl: null;
    backgroundUrl: string | null;
    previewUrl: string | null;
    titleUrl: null;
  };
  country: string[];
  genres: Array<{ id: number; name: string }>;
  details: VibixDetails;
  availabilityStatus: 'available';
  isPlayable: boolean;
  unavailableReason: null;
  externalPlayer: {
    provider: 'vibix';
    lookupType: 'movie' | 'series';
    lookupId: string;
    mediaType: 'movie' | 'series';
  } | null;
  /** Запасной плеер Videoseed (iframe), если запись найдена там по kp/imdb. */
  fallbackPlayer: { provider: 'videoseed'; iframeUrl: string } | null;
  source: 'vibix' | 'videoseed';
}
