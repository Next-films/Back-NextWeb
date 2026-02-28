import { ExternalApiTokenCreateInputDto } from '@/admin/api/dtos/input/external-api-token-create.input.dto';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';
import { ExternalApiTokenUpdateInputDto } from '@/admin/api/dtos/input/external-api-token-update.input.dto';
import { GetAllExternalTokensInputQueryDto } from '@/admin/api/dtos/input/get-all-external-tokens.input-query.dto';

export const ADMIN_EXTERNAL_TOKEN_TEST_DATA: ExternalApiTokenCreateInputDto = {
  name: 'name',
  expAt: ExternalApiTokenExpAtEnum.F,
};

export const ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA: ExternalApiTokenUpdateInputDto = {
  expAt: ExternalApiTokenExpAtEnum['1D'],
};

export const ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA: GetAllExternalTokensInputQueryDto = {
  size: 10,
  page: 1,
};
