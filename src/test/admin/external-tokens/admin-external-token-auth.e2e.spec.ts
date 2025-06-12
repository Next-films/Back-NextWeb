import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_EXTERNAL_API_ROUTE,
  EXTERNAL_API_ROUTE,
} from '@/common/constants/route.constants';
import { adminLogin } from '../../utils/auth/admin-login';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import * as request from 'supertest';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA,
  ADMIN_EXTERNAL_TOKEN_TEST_DATA,
  ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA,
} from '../../data/admin-external-token.test.data';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';

describe('Admin external token', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let baseAdminExternalTokenUti: string;
  let baseExternalTokenUri: string;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    const apiSettings = app
      .get(ConfigService<ConfigurationType, true>)
      .get('apiSettings', { infer: true });

    mainAdminLoginData.email = apiSettings.ADMIN_EMAIL;
    mainAdminLoginData.password = apiSettings.ADMIN_PASSWORD;

    baseUri = appUri + ADMIN_AUTH_ROUTES.MAIN;

    baseAdminExternalTokenUti = appUri + ADMIN_EXTERNAL_API_ROUTE.MAIN;
    baseExternalTokenUri = appUri + EXTERNAL_API_ROUTE.MAIN;

    loginByMainAdmin = () =>
      adminLogin(app, `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`, mainAdminLoginData);
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateAdminMigration>(GenerateAdminMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Admin external token => Create new token', () => {
    it('Admin should create new external token', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });

    it('Admin should not create new token, unauthorized', async () => {
      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer accessToken` })
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
      const { accessToken } = await loginByMainAdmin();

      const result1 = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
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

      const result2 = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
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

      const result3 = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
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
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);

      const badResult = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
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

  describe('Admin external token => Update token', () => {
    it('Admin should create new external token then update token, old token should not be valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(app.getHttpServer())
        .put(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(resultUpdate.body).toEqual({
        token: expect.any(String),
      });
      const externalToken2 = resultUpdate.body.token;

      expect(externalToken).not.toBe(externalToken2);

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(401);

      const checkTokenResult2 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken2}` })
        .expect(200);

      expect(checkTokenResult1.body.expAt).not.toBe(checkTokenResult2.body.expAt);
    });

    it('Admin should create new token then should not update token, unauthorized, old token should be valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(app.getHttpServer())
        .put(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA)
        .set({ authorization: `Bearer accessToken` })
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

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });

    it('Admin should create new token then should not update token, bad input data, old token should be valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(app.getHttpServer())
        .put(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
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

      const resultUpdate2 = await request(app.getHttpServer())
        .put(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
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

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });
  });

  describe('Admin external token => Remove token', () => {
    it('Admin should create new external token then update token then remove token, both tokens should not be valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultUpdate = await request(app.getHttpServer())
        .put(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_UPDATE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(resultUpdate.body).toEqual({
        token: expect.any(String),
      });
      const externalToken2 = resultUpdate.body.token;

      expect(externalToken).not.toBe(externalToken2);

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(401);

      const checkTokenResult2 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken2}` })
        .expect(200);
      const tokenId2 = checkTokenResult2.body.id;

      expect(checkTokenResult1.body.expAt).not.toBe(checkTokenResult2.body.expAt);

      await request(app.getHttpServer())
        .delete(`${baseAdminExternalTokenUti}/${tokenId2}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken2}` })
        .expect(401);
    });

    it('Admin should create new token then should not remove token, unauthorized, token should be valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      const resultDelete = await request(app.getHttpServer())
        .delete(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);

      expect(resultDelete.body).toEqual({
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

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });

    it('Admin should create new token then should not remove token, bad input data, token should be valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);

      const resultDelete = await request(app.getHttpServer())
        .delete(`${baseAdminExternalTokenUti}/tokenId/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultDelete.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'tokenId',
            errorKey: EXCEPTION_KEYS_ENUM.tokenId,
          },
        ],
      });

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
    });

    it('Admin should create new token then should not remove token, token not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      expect(result.body).toEqual({
        token: expect.any(String),
      });
      const externalToken = result.body.token;

      const checkTokenResult1 = await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(200);
      const tokenId = checkTokenResult1.body.id;

      await request(app.getHttpServer())
        .delete(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultDelete = await request(app.getHttpServer())
        .delete(`${baseAdminExternalTokenUti}/${tokenId}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      expect(resultDelete.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'tokenId',
            errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_NOT_FOUND,
          },
        ],
      });

      await request(app.getHttpServer())
        .get(`${baseExternalTokenUri}/${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
        .set({ authorization: `Bearer ${externalToken}` })
        .expect(401);
    });
  });

  describe('Admin external token => Get tokens', () => {
    it('Admin should create new external tokens then get tokens', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, name: 'token2' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'token3',
          expAt: ExternalApiTokenExpAtEnum['1D'],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      const result = await request(app.getHttpServer())
        .get(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
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
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, name: 'token2' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'token3',
          expAt: ExternalApiTokenExpAtEnum['1D'],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      const result = await request(app.getHttpServer())
        .get(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
        .query(ADMIN_EXTERNAL_TOKEN_INPUT_QUERY_DATA)
        .set({ authorization: `Bearer accessToken` })
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
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send(ADMIN_EXTERNAL_TOKEN_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({ ...ADMIN_EXTERNAL_TOKEN_TEST_DATA, name: 'token2' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);
      await request(app.getHttpServer())
        .post(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.CREATE_TOKEN}`)
        .send({
          ...ADMIN_EXTERNAL_TOKEN_TEST_DATA,
          name: 'token3',
          expAt: ExternalApiTokenExpAtEnum['1D'],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(201);

      const result1 = await request(app.getHttpServer())
        .get(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
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

      const result2 = await request(app.getHttpServer())
        .get(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
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

      const result3 = await request(app.getHttpServer())
        .get(`${baseAdminExternalTokenUti}/${ADMIN_EXTERNAL_API_ROUTE.TOKEN}`)
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
});
