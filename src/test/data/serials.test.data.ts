import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  GetSerialInputQuery,
  GetSerialSortFieldEnum,
} from '@/serials/api/dtos/input/get-serial.input-query';

export const TEST_GET_ALL_SERIALS_QUERY_DATA: GetSerialInputQuery = {
  size: 50,
  page: 1,
  sortDirection: SortDirectionEnum.ASC,
  sortField: GetSerialSortFieldEnum.RELEASE_DATE,
};
