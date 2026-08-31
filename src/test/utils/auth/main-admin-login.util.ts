import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import { ConfigurationType } from '@/settings/configuration';
import { adminLogin } from './admin-login';

export function createMainAdminLogin(
  app: INestApplication,
  appUri: string,
): {
  baseUri: string;
  loginData: AdminLoginInputModel;
  loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
} {
  const apiSettings = app.get(ConfigService<ConfigurationType, true>).get('apiSettings', {
    infer: true,
  });

  const loginData: AdminLoginInputModel = {
    login: apiSettings.ADMIN_EMAIL,
    password: apiSettings.ADMIN_PASSWORD,
  };

  const baseUri = appUri + ADMIN_AUTH_ROUTES.MAIN;

  return {
    baseUri,
    loginData,
    loginByMainAdmin: () => adminLogin(app, `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`, loginData),
  };
}
