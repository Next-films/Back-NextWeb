import { INestApplication } from '@nestjs/common';

import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';

import { TestService } from '../../test.service';

export type AdminAuthSuiteContext = {
  getApp: () => INestApplication;
  getTestService: () => TestService;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getBaseUri: () => string;
  getMainAdminLoginData: () => Record<string, unknown>;
  getAdminAuthSessionRepository: () => AdminAuthSessionRepository;
};
