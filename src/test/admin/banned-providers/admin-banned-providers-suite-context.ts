import { INestApplication } from '@nestjs/common';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';

export type AdminBannedProvidersSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getBaseBannedProviderMovieTokenUri: () => string;
};
