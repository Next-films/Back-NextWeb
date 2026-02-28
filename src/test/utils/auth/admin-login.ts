import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';

export const adminLogin = async (
  app: INestApplication,
  uri: string,
  loginData: AdminLoginInputModel,
): Promise<AdminLoginOutputDto> => {
  const result = await request(app.getHttpServer()).post(uri).send(loginData).expect(201);

  expect(result.body).toEqual({
    accessToken: expect.any(String),
  });

  const setCookieHeader = result.headers['set-cookie'];
  const refreshToken = Array.isArray(setCookieHeader)
    ? setCookieHeader
        .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
        ?.split(';')[0]
    : setCookieHeader?.split(';')[0];

  expect(refreshToken).not.toBe('');
  expect(refreshToken).toBeDefined();

  return {
    accessToken: result.body.accessToken,
    refreshToken: refreshToken,
  };
};
