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
  FILM_ALREADY_EXIST = 'error.film_already_exist',
  CARTOON_NOT_FOUND = 'error.cartoon_not_found',
  CARTOON_ALREADY_EXIST = 'error.cartoon_already_exist',
  SERIAL_NOT_FOUND = 'error.serial_not_found',
  EPISODE_NOT_FOUND = 'error.episode_not_found',
  EXTERNAL_API_TOKEN_ALREADY_EXIST = 'error.external_api_token_already_exist',
  EXTERNAL_API_TOKEN_NOT_FOUND = 'error.external_api_token_not_found',
  KP_MOVIE_NOT_FOUND = 'error.kp_movie_not_found', // Kinopoisk
  BANNED_MOVIE_BY_PROVIDER_NOT_FOUND = 'error.banned_movie_by_provider_not_found',
  MOVIE_NOT_BANNED_CANNOT_UNBAN = 'error.movie_not_banned_cannot_unban',
  BANNED_PROVIDER_MOVIE_NOT_FOUND = 'error.banned_provider_movie_not_found',
  MOVIE_ALREADY_UNDER_MODERATION = 'error.movie_already_under_moderation',
  INCORRECT_MOVIE_TYPE = 'error.incorrect_movie_type',
  MOVIE_ALREADY_EXIST = 'error.movie_already_exist', // Base error for all movie
  MODERATION_MOVIE_TASK_NOT_FOUND = 'error.moderation_movie_task_not_found',
  MODERATION_TASK_ALREADY_ACCEPTED = 'error_moderation_task_already_accepted',
  MODERATION_TASK_NOT_ACCEPTED = 'error_moderation_task_not_accepted',
  MODERATION_TASK_NOT_FOUND = 'error_moderation_task_not_found',
  MODERATION_TASK_NOT_BELONG_YOU = 'error_moderation_task_not_belong_you',
  MOVIE_ALREADY_MODERATED_BY_TORRENT = 'error_movie_already_moderated_by_torrent',
  PROVIDER_NOT_FOUND = 'error_provider_not_found',
  PROVIDER_MOVIE_NOT_FOUND = 'error_provider_movie_not_found',
  MOVIE_NOT_MODERATED = 'error_movie_not_moderated', // When user try to apply moderation but film have not moderate keys
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
  kpId = 'error_input.kpId',
  tokenId = 'error_input.tokenId',
  expAt = 'error_input.expAt',
  provider = 'error_input.provider',
  isBan = 'error_input.isBan',
  providerId = 'error_input.providerId',
  bannedProviderMovieId = 'error_input.bannedProviderMovieId',
  movieName = 'error_input.movieName',
  movieId = 'error_input.movieId',
  taskId = 'error_input.taskId',
  type = 'error_input.type',
  status = 'error_input.status',
  searchMovieName = 'error_input.searchMovieName',
  isModerate = 'error_input.isModerate',
}
