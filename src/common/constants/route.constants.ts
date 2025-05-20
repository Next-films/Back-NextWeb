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

export const SERIALS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/serials`,
};

export const CARTOONS_ROUTE = {
  MAIN: `${CINEMA_PREFIX}/cartoons`,
};
