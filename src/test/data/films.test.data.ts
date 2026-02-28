import {
  GetFilmsInputQuery,
  GetFilmsSortFieldEnum,
} from '@/films/api/dtos/input/get-films.input-query';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';

export const TEST_GET_ALL_FILMS_QUERY_DATA: GetFilmsInputQuery = {
  size: 50,
  page: 1,
  sortDirection: SortDirectionEnum.ASC,
  sortField: GetFilmsSortFieldEnum.RELEASE_DATE,
};
