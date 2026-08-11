import { MovieTypesEnum } from '@/common/types/types';

export type TmdbMediaType = 'movie' | 'tv';

export type TmdbAssetLookupInput = {
  movieType: MovieTypesEnum;
  tmdbId?: number | null;
  imdbId?: string | null;
  title?: string | null;
  originalTitle?: string | null;
  year?: number | null;
};

export type TmdbAssetCandidates = {
  tmdbId: number | null;
  mediaType: TmdbMediaType | null;
  backdropUrls: string[];
  trailerUrl: string | null;
};

export type TmdbImageConfiguration = {
  images?: {
    secure_base_url?: string;
    backdrop_sizes?: string[];
  };
};

export type TmdbImage = {
  file_path?: string | null;
  width?: number;
  height?: number;
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
};

export type TmdbVideo = {
  key?: string | null;
  site?: string | null;
  type?: string | null;
  official?: boolean;
  size?: number;
  name?: string | null;
  iso_639_1?: string | null;
};

export type TmdbMediaDetails = {
  id?: number;
  backdrop_path?: string | null;
  images?: {
    backdrops?: TmdbImage[];
  };
  videos?: {
    results?: TmdbVideo[];
  };
};

export type TmdbSearchResult = {
  id?: number;
  backdrop_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  title?: string | null;
  name?: string | null;
  original_title?: string | null;
  original_name?: string | null;
};

export type TmdbSearchResponse = {
  results?: TmdbSearchResult[];
};

export type TmdbFindResponse = {
  movie_results?: TmdbSearchResult[];
  tv_results?: TmdbSearchResult[];
};
