import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ADMIN_EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA,
  ADMIN_EXTERNAL_TOKEN_TEST_DATA,
} from '../../../data/admin-external-token.test.data';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';

export type ExternalTokenGetSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getBaseAdminExternalTokenUti: () => string;
};

export function registerGetExternalTokenSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseAdminExternalTokenUti,
}: ExternalTokenGetSuiteContext): void {
  describe('Admin external token => Get tokens', () => {
    it('Admin should create new external tokens then get tokens', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, name: 'token2' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'token3',
          expAt: ExternalApiTokenExpAtEnum['1D'],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .query(ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 3,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(3);
      expect(result.body.items[0]).toEqual({
        id: 3,
        name: 'token3',
        expAt: expect.any(String),
      });
      expect(result.body.items[1]).toEqual({
        id: 2,
        name: 'token2',
        expAt: null,
      });
    });

    it('Admin should create new tokens then should not get tokens, unauthorized', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, name: 'token2' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'token3',
          expAt: ExternalApiTokenExpAtEnum['1D'],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .query(ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA)
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

    it('Admin should create new tokens then should not get tokens, bad input data and bad page', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, name: 'token2' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(getApp().getHttpServer())
        .post(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'token3',
          expAt: ExternalApiTokenExpAtEnum['1D'],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      const result1 = await request(getApp().getHttpServer())
        .get(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .query({ ...ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA, page: 10 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'page',
            errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
          },
        ],
      });

      const result2 = await request(getApp().getHttpServer())
        .get(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .query({ ...ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA, page: 'page' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'page',
            errorKey: EXCEPTION_KEYS_ENUM.page,
          },
        ],
      });

      const result3 = await request(getApp().getHttpServer())
        .get(`${getBaseAdminExternalTokenUti()}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .query({ ...ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA, size: 'size' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'size',
            errorKey: EXCEPTION_KEYS_ENUM.size,
          },
        ],
      });
    });
  });
}
