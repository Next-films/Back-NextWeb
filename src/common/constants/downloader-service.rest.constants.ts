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
};

export const DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS = {
  MAIN: 'movies/private',
  REMOVE: 'remove',
  ADD_TO_QUEUE: 'add-to-queue',
};
