export type VibixMediaType = 'films' | 'serials' | 'cartoons';

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
  duration?: number | string | null;
  genre?: string[] | string | null;
  country?: string[] | string | null;
  description?: string | null;
  description_short?: string | null;
  uploaded_at?: string | null;
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
  availabilityStatus: 'available';
  isPlayable: true;
  unavailableReason: null;
  externalPlayer: {
    provider: 'vibix';
    lookupType: 'movie' | 'series';
    lookupId: string;
    mediaType: 'movie' | 'series';
  };
  source: 'vibix';
}
