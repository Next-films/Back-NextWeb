import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ADMIN_EXTERNAL_API_ROUTE, EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ADMIN_EXTERNAL_TOKEN_TEST_DATA } from '../../../data/admin-external-token.test.data';

export type ExternalTokenCreateSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getBaseAdminExternalTokenUti: () => string;
  getBaseExternalTokenUri: () => string;
};

export function registerCreateExternalTokenSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseAdminExternalTokenUti,
  getBaseExternalTokenUri,
}: ExternalTokenCreateSuiteContext): void {
  describe('Admin external token => Create new token', () => {
    it('Admin should create new external token', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });

    it('Admin should not create new token, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: 'Bearer accessToken' })
        .expect(401);

      expect(result.body).toEqual({
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
    });

    it('Admin should not create new token, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result1 = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ name: '    ', expAt: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
          {
            message: expect.any(String),
            field: 'expAt',
            errorKey: EXCEPTION_KEYS_ENUM.expAt,
          },
        ],
      });

      const result2 = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, expAt: 'FOREVER' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
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

      const result3 = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'jnjfrnjkrfnjkrnjknfrjknjkfrnjkfrnjkfrnjkrfjkfnrjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
        ],
      });
    });

    it('Admin should not create new token, token name already exist', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      await request(getApp().getHttpServer())
        .get(`${getBaseExternalTokenUri()}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);

      const badResult = await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_ALREADY_EXIST,
          },
        ],
      });
    });
  });
}
