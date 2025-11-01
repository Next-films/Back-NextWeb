export const RMQ_CLIENT_MODULE_NAME = 'RMQ_CLIENT_MODULE';
export const DOWNLOAD_SERVICE_RMQ_NAME = 'DOWNLOAD_SERVICE';

export const GET_FILM_BY_KP_ID_CMD = 'get_film_by_kp_id_cmd';
export const GET_CARTOON_BY_KP_ID_CMD = 'get_cartoon_by_kp_id_cmd';

export const MODERATE_MOVIE_CMD = 'moderate_movie_cmd';
export const NEW_FILM_CMD = 'new_film_cmd';
export const NEW_CARTOON_CMD = 'new_cartoon_cmd';
export const NEW_SERIAL_CMD = 'new_serial_cmd';

/*
 *
 * Bridges to download service
 *
 */
export const BRIDGE_FIND_FILMS_CMD = 'bridge_find_films_cmd';
export const BRIDGE_DOWNLOAD_FILMS_CMD = 'bridge_download_films_cmd';
export const BRIDGE_FIND_CARTOONS_CMD = 'bridge_find_cartoon_cmd';
export const BRIDGE_DOWNLOAD_CARTOONS_CMD = 'bridge_download_cartoon_cmd';
export const BRIDGE_FIND_SERIALS_CMD = 'bridge_find_serials_cmd';
export const BRIDGE_DOWNLOAD_SERIALS_CMD = 'bridge_download_serials_cmd';

/*
 *
 * Notification that the movie has been added to the queue for processing, so as not to pick up duplicates from kinopoisk
 *
 */
export const NEW_FILM_IS_HANDLE_CMD = 'new_film_is_handle_cmd';
export const NEW_CARTOON_IS_HANDLE_CMD = 'new_cartoon_is_handle_cmd';
export const NEW_SERIAL_IS_HANDLE_CMD = 'new_serial_is_handle_cmd';
export const NEW_BACKGROUND_CONTENT_FOR_FILM_CMD = 'new_background_content_for_film_cmd';

/*
 *
 * Log files cmd
 *
 */
export const UPLOADED_LOG_FILES_CMD = 'uploaded_log_files_cmd';
export const CLEAR_LOGS_CMD = 'clear_logs_cdm';

/*
 *
 * Ban providers movie
 *
 */
export const BAN_PROVIDER_MOVIE_CMD = 'ban_provider_movie_cmd';
export const GET_BANNED_MOVIE_BY_PROVIDER_CMD = 'get_banned_movie_by_provider_cmd';

/*
 *
 * Movies cmd
 *
 */
export const REMOVE_MOVIE_CMD = 'remove_movie_cmd';
export const ADD_MOVIE_TO_DOWNLOAD_QUEUE_CMD = 'add_movie_to_download_queue_cmd';

/*
 *
 * Downloader cmd
 *
 */
export const DOWNLOAD_YT_CLIP_CMD = 'download_yt_clip_cmd';
export const UPLOAD_FILM_CMD = 'upload_film_cmd';

/*
 *
 * Convert img cmd
 *
 */
export const RESIZE_SAVE_POSTER_CMD = 'resize_save_poster_cmd';
export const RESIZE_SAVE_LOGO_CMD = 'resize_save_logo_cmd';
/*
 *
 * Users - admin cmd
 *
 */
export const ADMIN_UPLOAD_AVATAR_CMD = 'admin_upload_avatar_cmd';
