export type FanartMovieBackground = {
  id?: string;
  url?: string | null;
  lang?: string | null;
  likes?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
};

export type FanartMovieResponse = {
  name?: string;
  tmdb_id?: string;
  imdb_id?: string;
  moviebackground?: FanartMovieBackground[];
};

export type FanartMovieBackgroundLookupInput = {
  tmdbId?: number | null;
  imdbId?: string | null;
};
