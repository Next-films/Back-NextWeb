import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  GetCartoonInputQuery,
  GetCartoonSortFieldEnum,
} from '@/cartoons/api/dtos/input/get-cartoon.input-query';

export const TEST_GET_ALL_CARTOONS_QUERY_DATA: GetCartoonInputQuery = {
  size: 50,
  page: 1,
  sortDirection: SortDirectionEnum.ASC,
  sortField: GetCartoonSortFieldEnum.RELEASE_DATE,
};
