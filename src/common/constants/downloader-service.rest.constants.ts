export const DOWNLOADER_HTTP_SERVICE = 'DOWNLOADER_HTTP_SERVICE';

export const DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS = {
  MAIN: 'bridge',
  RUN_BY_LIST: 'run-by-list',
  CANCEL: 'cancel',
  FILMS: 'films',
  CARTOONS: 'cartoons',
  SERIALS: 'serials',
  SEASONS: 'seasons',
  DOWNLOAD: 'download',
  FIND: 'find',
  RECONCILE: 'reconcile',
  SCHEDULE: 'schedule',
  STATUS: 'status',
};

const CONVERTER_PREFIX = 'converter';
export const DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS = {
  MAIN: `${CONVERTER_PREFIX}/private`,
  LOGS: 'logs',
  CLEAR: 'clear',
  POSTER: 'poster',
  LOGO: 'logo',
  RESIZE: 'resize',
};

export const DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS = {
  MAIN: 'movies/private',
  REMOVE: 'remove',
  ADD_TO_QUEUE: 'add-to-queue',
};

export const DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS = {
  MAIN: 'downloader/private',
  DOWNLOAD: 'download',
  YT_CLIP: 'yt-clip',
  MOVIE: 'movie',
  UPLOAD: 'upload',
  SIGN_URL: 'sign-url',
};

export const DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS = {
  MAIN: `admin/private`,
  AVATAR: 'avatar',
  UPLOAD: 'upload',
};
