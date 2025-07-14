import {
  GetAllModerationMovieTaskInputQueryDto,
  ModerationMovieTaskSortFiledEnum,
} from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { MovieTypesEnum } from '@/common/types/types';
import { AdminApplyModerationMovieTaskInputDto } from '@/admin/api/dtos/input/admin-apply-moderation-movie-task.input.dto';

export const TEST_MODERATION_GET_ALL_DATA: GetAllModerationMovieTaskInputQueryDto = {
  size: 10,
  page: 1,
  sortDirection: SortDirectionEnum.DESC,
  sortField: ModerationMovieTaskSortFiledEnum.CREATED_AT,
  type: MovieTypesEnum.FILM,
};

export const TEST_MODERATION_APPLY_TASK: AdminApplyModerationMovieTaskInputDto = {
  country: ['Country'],
  type: MovieTypesEnum.FILM,
  trailerUrl: 'https://trailer.com',
  alternativeName: 'Alternative name',
  originalName: 'Original name',
  name: 'New name',
  description: 'Description',
  previewUrl: 'https://preview.com',
  duration: 1000,
  backgroundContentUrl: 'https://background.com',
  releaseDate: new Date(),
  titleUrl: 'https://title.com',
  kpId: '999',
  genres: ['Боевик'],
  videUrl: 'https://video.com',
};
