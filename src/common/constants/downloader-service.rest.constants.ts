export const DOWNLOADER_HTTP_SERVICE = 'DOWNLOAD_SERVICE';

export const DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS = {
  MAIN: 'bridge',
  FILMS: 'films',
  CARTOONS: 'cartoons',
  SERIALS: 'serials',
  DOWNLOAD: 'download',
  FIND: 'find',
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
};

export const DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS = {
  MAIN: `admin/private`,
  AVATAR: 'avatar',
  UPLOAD: 'upload',
};
