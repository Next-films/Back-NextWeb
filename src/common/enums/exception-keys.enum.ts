export enum EXCEPTION_KEYS_ENUM {
  /*
   *
   * Api error
   *
   */
  INCORRECT_INPUT_DATA = 'error.incorrect_input_data',
  INCORRECT_PAGE = 'error.incorrect_page',
  GENRE_NAME_IS_EXIST = 'error.genre_name_is_exist',
  GENRE_NOT_FOUND = 'error.genre_not_found',
  EMAIL_IS_EXIST = 'error.email_is_exist',
  USERNAME_IS_EXIST = 'error.username_is_exist',
  LOGIN_OR_PASSWORD_NOT_CORRECT = 'error.login_or_password_not_correct',
  UNAUTHORIZED = 'error.unauthorized',
  FILM_NOT_FOUND = 'error.film_not_found',
  CARTOON_NOT_FOUND = 'error.cartoon_not_found',
  SERIAL_NOT_FOUND = 'error.serial_not_found',
  EPISODE_NOT_FOUND = 'error.episode_not_found',
  /*
   *
   * Input validation error
   *
   */
  searchName = 'error_input.search_name',
  searchGenreIds = 'error_input.search_genre_ids',
  page = 'error_input.page',
  size = 'error_input.size',
  sortDirection = 'error_input.sort_direction',
  sortField = 'error_input.sort_field',
  email = 'error_input.email',
  password = 'error_input.password',
  username = 'error_input.username',
  name = 'error_input.name',
  filmId = 'error_input.film_id',
  serialId = 'error_input.serial_id',
  cartoonId = 'error_input.cartoon_id',
  episodeId = 'error_input.episode_id',
  email_password = 'error_input.email_password',
  token = 'error_input.token',
  genreId = 'error_input.genreId',
}
