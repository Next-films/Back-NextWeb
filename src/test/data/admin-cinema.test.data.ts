import {
  AdminGetAllFilmsInputQueryDto,
  AdminGetFilmsSortFieldEnum,
  AdminGetFilmsStatusEnum,
} from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { AdminShowOrHiddeFilmInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-film.input.dto';
import { AdminUpdateFilmInputDto } from '@/admin/api/dtos/input/admin-update-film.input.dto';
import { AdminUpdateCartoonInputDto } from '@/admin/api/dtos/input/admin-update-cartoon.input.dto';
import { AdminShowOrHiddeCartoonInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-cartoon.input.dto';
import { AdminGetAllCartoonsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-cartoons.input-query.dto';

export const TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA: AdminGetAllFilmsInputQueryDto = {
  page: 1,
  size: 10,
  status: AdminGetFilmsStatusEnum.ALL,
  sortDirection: SortDirectionEnum.DESC,
  sortField: AdminGetFilmsSortFieldEnum.RELEASE_DATE,
};

export const TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA: AdminShowOrHiddeFilmInputDto = {
  isHidden: true,
  isModerate: false,
};

export const TEST_ADMIN_CINEMA_FILMS_UPDATE_DATA: AdminUpdateFilmInputDto = {
  name: 'Update movie name',
  releaseDate: new Date('2020.01.01'),
  alternativeName: 'Update Alt name',
  description: 'Update desc',
  duration: 9000,
  backgroundContentUrl: 'https://update-back.com',
  country: ['Update country'],
  kpId: '0913',
  originalName: 'Update orig name',
  previewUrl: 'https://update-preview.com',
  titleUrl: 'https://update-title.com',
  videUrl: 'https://update-video.com',
  trailerUrl: 'https://update-trailer.com',
};

export const TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA: AdminGetAllCartoonsInputQueryDto = {
  page: 1,
  size: 10,
  status: AdminGetFilmsStatusEnum.ALL,
  sortDirection: SortDirectionEnum.DESC,
  sortField: AdminGetFilmsSortFieldEnum.RELEASE_DATE,
};

export const TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA: AdminShowOrHiddeCartoonInputDto = {
  isHidden: true,
  isModerate: false,
};

export const TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA: AdminUpdateCartoonInputDto = {
  name: 'Update movie name',
  releaseDate: new Date('2020.01.01'),
  alternativeName: 'Update Alt name',
  description: 'Update desc',
  duration: 9000,
  backgroundContentUrl: 'https://update-back.com',
  country: ['Update country'],
  kpId: '0913',
  originalName: 'Update orig name',
  previewUrl: 'https://update-preview.com',
  titleUrl: 'https://update-title.com',
  videUrl: 'https://update-video.com',
  trailerUrl: 'https://update-trailer.com',
};
