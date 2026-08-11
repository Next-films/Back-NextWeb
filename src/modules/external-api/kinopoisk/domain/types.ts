export enum KinopoiskSearchMovieType {
  MOVIE = 'movie',
  TV_SERIES = 'tv-series',
  ANIME = 'anime',
  CARTOON = 'cartoon',
  ANIMATED_SERIES = 'animated-series',
}

export enum KinopoiskFilmStatusEnum {
  FILMING = 'filming',
  PRE_PRODUCTION = 'pre-production',
  COMPLETED = 'completed',
}

export interface KinopoiskExternalId {
  kpHD?: string;
  imdb?: string;
  tmdb?: number;
}

export interface KinopoiskLocalizedName {
  name: string;
  language?: string;
  type?: string;
}

/**
 * @description The fact stated in the movie (spoilers, interesting facts, etc.)
 */
export interface KinopoiskFactInMovie {
  value: string;
  type?: string;
  spoiler?: boolean;
}

/**
 * @description Ratings on different platforms
 */
export interface KinopoiskRating {
  kp?: number;
  imdb?: number;
  tmdb?: number;
  filmCritics?: number;
  russianFilmCritics?: number;
  await?: number;
}

/**
 * @description The number of votes on different platforms
 */
export interface KinopoiskVotes {
  kp?: string;
  imdb?: number;
  tmdb?: number;
  filmCritics?: number;
  russianFilmCritics?: number;
  await?: number;
}

export interface KinopoiskLogo {
  url?: string;
}

/**
 * @description Poster or preview image
 */
export interface KinopoiskShortImage {
  url?: string;
  previewUrl?: string;
}

export interface KinopoiskImage extends KinopoiskShortImage {
  movieId?: number;
  type?: string;
  width?: number;
  height?: number;
  language?: string | null;
}

export interface KinopoiskPaginatedResponse<T> {
  docs?: T[];
  total?: number;
  limit?: number;
  page?: number;
  pages?: number;
}

export interface KinopoiskVideo {
  url?: string;
  name?: string;
  site?: string;
  size?: number;
  type?: string;
}

/**
 * @description A set of trailers
 */
export interface KinopoiskVideoTypes {
  trailers?: KinopoiskVideo[];
}

export interface KinopoiskItemName {
  name: string;
}

/**
 * @description The person in the film (actor, director, etc.)
 * @param id The person's ID from Kinopoisk
 */
export interface KinopoiskPersonInMovie {
  id: number;
  photo?: string;
  name?: string;
  enName?: string;
  description?: string;
  profession?: string;
  enProfession?: string;
}

export interface KinopoiskReviewInfo {
  count?: number;
  positiveCount?: number;
  percentage?: string;
}

export interface KinopoiskSeasonInfo {
  number?: number;
  episodesCount?: number;
}

export interface KinopoiskCurrencyValue {
  value?: number;
  currency?: string;
}

/**
 * @description Film collections in different regions
 */
export interface KinopoiskFees {
  world?: KinopoiskCurrencyValue;
  russia?: KinopoiskCurrencyValue;
  usa?: KinopoiskCurrencyValue;
}

export interface KinopoiskPremiere {
  country?: string;
  world?: string;
  russia?: string;
  digital?: string;
  cinema?: string;
  bluray?: string;
  dvd?: string;
}

/**
 * @description Related Movie (Prequel, sequel, similar)
 */
export interface KinopoiskLinkedMovie {
  id: number;
  name?: string;
  enName?: string;
  alternativeName?: string;
  type?: string;
  poster?: KinopoiskShortImage;
  rating?: KinopoiskRating;
  year?: number;
}

export interface KinopoiskWatchabilityItem {
  name?: string;
  logo: KinopoiskLogo;
  url: string;
}

export interface KinopoiskWatchability {
  items: KinopoiskWatchabilityItem[];
}

export interface KinopoiskYearRange {
  start?: number;
  end?: number;
}

export interface KinopoiskAudience {
  count?: number;
  country?: string;
}

export interface KinopoiskNetworkItem {
  name?: string;
  logo?: KinopoiskLogo;
}

/**
 * @description Platform (for example, Netflix)
 */
export interface KinopoiskNetworks {
  items?: KinopoiskNetworkItem[];
}

/**
 * @description Ratings on different platforms
 * @param name Name in Russian
 * @param typeNumber The type of title in numerical form: 1 (movie), 2 (TV-series), etc.
 * @param ticketsOnSale A sign that the sale
 * @param lists The names of the collections that contain the film
 */
export interface KinopoiskMovie {
  id?: number;
  externalId?: KinopoiskExternalId;

  name?: string;
  alternativeName?: string;
  enName?: string;
  names?: KinopoiskLocalizedName[];

  type?: KinopoiskSearchMovieType;
  typeNumber?: number;

  year?: number;

  description?: string;
  shortDescription?: string;
  slogan?: string;

  status?: KinopoiskFilmStatusEnum;

  facts?: KinopoiskFactInMovie[];
  rating?: KinopoiskRating;
  votes?: KinopoiskVotes;

  movieLength?: number;

  ratingMpaa?: string;
  ageRating?: number;

  logo?: KinopoiskLogo;
  poster?: KinopoiskShortImage;
  backdrop?: KinopoiskShortImage;
  videos?: KinopoiskVideoTypes;

  genres?: KinopoiskItemName[];
  countries?: KinopoiskItemName[];
  persons?: KinopoiskPersonInMovie[];
  reviewInfo?: KinopoiskReviewInfo;
  seasonsInfo?: KinopoiskSeasonInfo[];

  budget?: KinopoiskCurrencyValue;

  fees?: KinopoiskFees;

  premiere?: KinopoiskPremiere;

  similarMovies?: KinopoiskLinkedMovie[];
  sequelsAndPrequels?: KinopoiskLinkedMovie[];
  watchability?: KinopoiskWatchability;
  releaseYears?: KinopoiskYearRange[];

  top10?: number;
  top250?: number;

  ticketsOnSale?: boolean;

  totalSeriesLength?: number;

  seriesLength?: number;

  isSeries?: boolean;

  audience?: KinopoiskAudience[];

  lists?: string[];

  networks?: KinopoiskNetworks;

  updatedAt?: string;
  createdAt?: string;
}
