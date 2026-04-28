import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ADMIN_EXTERNAL_API_ROUTE, EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_EXTERNAL_TOKEN_TEST_DATA,
  ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA,
} from '../../../data/admin-external-token.test.data';

export type ExternalTokenUpdateSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getBaseAdminExternalTokenUti: () => string;
  getBaseExternalTokenUri: () => string;
};

export function registerUpdateExternalTokenSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseAdminExternalTokenUti,
  getBaseExternalTokenUri,
}: ExternalTokenUpdateSuiteContext): void {
  describe('Admin external token => Update token', () => {
    it('Admin should create new external token then update token, old token should not be valid', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({ token: expect.any(String) });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(getApp().getHttpServer())
        .put(`${getBaseAdminExternalTokenUti()}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(resultUpdate.body).toEqual({ token: expect.any(String) });
      const externalToken2 = resultUpdate.body.token;

      expect(externalToken).not.toBe(externalToken2);

      await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(401);

      const checkTokenResult2 = await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken2}` })
        .expect(200);

      expect(checkTokenResult1.body.expAt).not.toBe(checkTokenResult2.body.expAt);
    });

    it('Admin should create new token then should not update token, unauthorized, old token should be valid', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({ token: expect.any(String) });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(getApp().getHttpServer())
        .put(`${getBaseAdminExternalTokenUti()}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA)
        .set({ authorization: 'Bearer accessToken' })
        .expect(401);

      expect(resultUpdate.body).toEqual({
        message: expect.any(String),
        statusCode: 401,
        errorField: [
          {
            message: expect.any(String),
            field: 'token',
            errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
          },
        ],
      });

      await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });

    it('Admin should create new token then should not update token, bad input data, old token should be valid', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({ token: expect.any(String) });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(getApp().getHttpServer())
        .put(`${getBaseAdminExternalTokenUti()}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send({ expAt: '  ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultUpdate.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'expAt',
            errorKey: EXCEPTION_KEYS_ENUM.expAt,
          },
        ],
      });

      const resultUpdate2 = await request(getApp().getHttpServer())
        .put(`${getBaseAdminExternalTokenUti()}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send({ expAt: 'FOREVER' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultUpdate2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'expAt',
            errorKey: EXCEPTION_KEYS_ENUM.expAt,
          },
        ],
      });

      await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });
  });
}
