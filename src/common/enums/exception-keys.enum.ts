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
  /*
   *
   * Input validation error
   *
   */
  searchName = 'error_input.searchName',
  page = 'error_input.page',
  size = 'error_input.size',
  sortDirection = 'error_input.sortDirection',
  sortField = 'error_input.sortField',
  email = 'error_input.email',
  password = 'error_input.password',
  username = 'error_input.username',
  name = 'error_input.name',
  filmId = 'error_input.filmId',
}
