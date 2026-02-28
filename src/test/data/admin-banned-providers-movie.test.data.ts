import { AdminBanUnbanProviderMovieInputDto } from '@/admin/api/dtos/input/ban-unban-provider-movie.input.dto';
import { TorApiProvidersEnum } from '@/common/types/types';
import { AdminUpdateBannedProviderMovieInputDto } from '@/admin/api/dtos/input/admin-update-banned-provider-movie.input.dto';
import { GetAllBannedProvidersMoviesInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-banned-providers-movies.input-query.dto';

export const ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA: AdminBanUnbanProviderMovieInputDto = {
  isBan: true,
  movieName: 'movie',
  providerId: '12345',
  provider: TorApiProvidersEnum.KINOZAL,
};

export const ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA: AdminUpdateBannedProviderMovieInputDto =
  {
    movieName: 'other_movie',
  };

export const ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA: AdminBanUnbanProviderMovieInputDto = {
  isBan: false,
  movieName: 'movie',
  providerId: '12345',
  provider: TorApiProvidersEnum.KINOZAL,
};

export const ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA: GetAllBannedProvidersMoviesInputQueryDto = {
  page: 1,
  size: 10,
};
