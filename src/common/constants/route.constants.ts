/*
*
*
        Admin
*
*
*/
const ADMIN_PREFIX = 'admin';

export const ADMIN_AUTH_ROUTES = {
  MAIN: `${ADMIN_PREFIX}/auth`,
  REGISTRATION: 'registration',
  LOGIN: 'login',
  UPDATE_TOKENS: 'refresh-token',
  LOGOUT: 'logout',
  ME: 'me',
};

export const ADMIN_GENRE_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/genre`,
};

export const ADMIN_EXTERNAL_API_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/external-api`,
  CREATE_TOKEN: 'create-token',
  TOKEN: 'token',
};

export const ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/banned-providers-movies`,
};

export const ADMIN_CINEMA_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/cinema`,
  FILMS: `films`,
  CARTOONS: `cartoons`,
};

export const ADMIN_MODERATION_MOVIE_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/movie/moderation`,
  APPLY: `apply`,
  CANCEL: `cancel`,
  ACCEPT: 'accept',
};
/*
*
*
        Cinema: movies/films/cartoons/serials
*
*
*/
const CINEMA_PREFIX = 'cinema';

export const MOVIES_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/movies`,
  GENRE: 'genre',
};

export const FILMS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/films`,
};

export const PRIVATE_FILMS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/private/films`,
  NEW_FILM: 'new-film',
  NEW_FILM_IS_HANDLE: 'new-film/is-handle',
  KP: `kp`,
};

export const BRIDGE_RMG_FILMS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/bridge-rmq/films`,
  FIND: 'find',
  DOWNLOAD: 'download',
};

export const SERIALS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/serials`,
};

export const BRIDGE_RMG_SERIALS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/bridge-rmq/serials`,
  FIND: 'find',
  DOWNLOAD: 'download',
};

export const CARTOONS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/cartoons`,
};

export const PRIVATE_CARTOONS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/private/cartoons`,
  KP: `kp`,
  NEW_CARTOON: 'new-cartoon',
  NEW_CARTOON_IS_HANDLE: 'new-cartoon/is-handle',
};

export const BRIDGE_RMG_CARTOON_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/bridge-rmq/cartoon`,
  FIND: 'find',
  DOWNLOAD: 'download',
};
/*
*
*
        External api auth
*
*
*/
const EXTERNAL_API_PREFIX = 'external-api';

export const EXTERNAL_API_ROUTE = {
  MAIN: `${EXTERNAL_API_PREFIX}`,
  TOKEN: 'token',
  CHECK: 'check',
};
/*
*
*
        Logs
*
*
*/
const LOGS_PREFIX = 'logs';
export const PRIVATE_CONVERTER_LOGS_ROUTE = {
  MAIN: `${LOGS_PREFIX}/private/converter`,
};
/*
*
*
        Logs
*
*
*/
export const PRIVATE_BANNED_PROVIDERS_ROUTE = {
  MAIN: `banned-providers-movies/private`,
};
