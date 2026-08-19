const ADMIN_PREFIX = 'admin';

export const ADMIN_ROUTE = {
  MAIN: ADMIN_PREFIX,
  ROLES: 'roles',
  AVATAR: 'avatar',
  REMOVE: 'remove',
};

export const ADMIN_AUTH_ROUTES = {
  MAIN: `${ADMIN_PREFIX}/auth`,
  REGISTRATION: 'registration',
  LOGIN: 'login',
  TELEGRAM_LOGIN: 'telegram/login',
  SET_PASSWORD: 'set-password',
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
  CONFIG: 'config',
  TRANSPORT: 'transport',
  CONNECTIONS: 'connections',
  TRIGGERS: 'triggers',
  TRIGGERS_STATUS: 'triggers/status',
  TRIGGERS_RUN_BY_LIST: 'triggers/run-by-list',
  TRIGGERS_CANCEL: 'triggers/cancel',
  SIGN_MEDIA_URL: 'media/sign-url',
};

export const ADMIN_ANALYTICS_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/analytics`,
  SUMMARY: 'summary',
  VISITS: 'visits',
  GENRES: 'genres',
  TYPES: 'types',
};

export const ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/banned-providers-movies`,
};

export const ADMIN_CINEMA_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/cinema`,
  FILMS: `films`,
  CARTOONS: `cartoons`,
  SERIALS: `serials`,
  PREMIERES: `premieres`,
};

export const ADMIN_BANNER_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/banners`,
};

export const BANNER_ROUTE = {
  MAIN: `banners`,
};

export const ADMIN_VIEWER_BUTTON_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/viewer-buttons`,
};

export const VIEWER_BUTTON_ROUTE = {
  MAIN: `viewer-buttons`,
};

export const ADMIN_HOME_SECTIONS_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/cinema/home-sections`,
};

export const HOME_SECTIONS_ROUTE = {
  MAIN: `home-sections`,
};

export const ADMIN_PRIVATE_CINEMA_ROUTE = {
  MAIN: `${ADMIN_PREFIX}/private/cinema`,
  FILMS: `films`,
  CARTOONS: `cartoons`,
  MODERATION: `moderation`,
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
  UPCOMING: 'new-film/upcoming',
  NEW_FILM_IS_HANDLE: 'new-film/is-handle',
  REPLACE_SOURCE: 'replace-source',
  KP: `kp`,
  NEW_BACKGROUND_CONTENT: 'new-background-content',
};

export const BRIDGE_RMG_FILMS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/bridge-rmq/films`,
  FIND: 'find',
  DOWNLOAD: 'download',
};

export const SERIALS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/serials`,
};

export const PRIVATE_SERIALS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/private/serials`,
  NEW_SERIAL: 'new-serial',
  UPCOMING: 'new-serial/upcoming',
  NEW_SERIAL_IS_HANDLE: 'new-serial/is-handle',
  KP: `kp`,
  NEW_BACKGROUND_CONTENT: 'new-background-content',
};

export const BRIDGE_RMG_SERIALS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/bridge-rmq/serials`,
  FIND: 'find',
  DOWNLOAD: 'download',
};

export const CARTOONS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/cartoons`,
};

export const MEDIA_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/media`,
  SIGN_URL: 'sign-url',
};

export const PRIVATE_CARTOONS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/private/cartoons`,
  KP: `kp`,
  NEW_CARTOON: 'new-cartoon',
  UPCOMING: 'new-cartoon/upcoming',
  NEW_CARTOON_IS_HANDLE: 'new-cartoon/is-handle',
  REPLACE_SOURCE: 'replace-source',
  NEW_BACKGROUND_CONTENT: 'new-background-content',
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
  CONFIG: 'config',
  SYNC: 'sync',
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
        Banned providers
*
*
*/
export const PRIVATE_BANNED_PROVIDERS_ROUTE = {
  MAIN: `banned-providers-movies/private`,
};
