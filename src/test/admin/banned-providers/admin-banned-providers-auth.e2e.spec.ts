import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE,
} from '@/common/constants/route.constants';
import { adminLogin } from '../../utils/auth/admin-login';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import * as request from 'supertest';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA,
} from '../../data/admin-banned-providers-movie.test.data';
import { TorApiProvidersEnum } from '@/common/types/types';

describe('Admin banned providers movies', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let baseBannedProviderMovieTokenUri: string;

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

    baseBannedProviderMovieTokenUri = appUri + ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE.MAIN;

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

  describe('Admin banned providers movies => Ban/Unban provider movie', () => {
    it('Admin should ban movie', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
    });

    it('Admin should ban movie then ban again', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result2.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
    });

    it('Admin should ban movie then unban movie ', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(0);
    });

    it('Admin should not ban movie, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      const resultUnauthorized = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);

      expect(resultUnauthorized.body).toEqual({
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

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(0);
    });

    it('Admin should not ban movie, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result1 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({})
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.providerId,
          },
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.provider,
          },
          {
            message: expect.any(String),
            field: 'isBan',
            errorKey: EXCEPTION_KEYS_ENUM.isBan,
          },
        ],
      });

      const result2 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({ ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA, isBan: 'good' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isBan',
            errorKey: EXCEPTION_KEYS_ENUM.isBan,
          },
        ],
      });

      const result3 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({ ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA, provider: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.provider,
          },
        ],
      });

      const result4 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({ ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA, provider: 'other' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result4.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.provider,
          },
        ],
      });

      const result5 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({ ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA, providerId: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result5.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.providerId,
          },
        ],
      });

      const result6 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({
          ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
          providerId: 'njrfnjnfjkrnrjksnjsrfnjknfrjjnknrsjknrjksnjfkrsnjksfrnjksfrnjkjnkrfsnkjrs',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result6.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.providerId,
          },
        ],
      });

      const result7 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({
          ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
          movieName:
            'njrfnjnfjkrnrjksnjsrfmkrflkfrjnrjfnrjkrfnjkrnjkfnrjknrfjnjrfnjkrfnjkfrnjkfrnjnfrjknfrjknfjrknrjfkjhkfrbhfrbhrfbhjfbrhjbfrhjhjfrbhjfrbhjbfrhjbhrfjhjrbfhjrfbhfrbhjbrfhjbhrfnjknfrjjnknrsjknrjksnjfkrsnjksfrnjksfrnjkjnkrfsnkjrs',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result7.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });

      const result8 = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({
          ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
          movieName: '    ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result8.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });
    });

    it('Admin should not unban movie, movie not banned', async () => {
      const { accessToken } = await loginByMainAdmin();

      const badResult = await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isBan',
            errorKey: EXCEPTION_KEYS_ENUM.MOVIE_NOT_BANNED_CANNOT_UNBAN,
          },
        ],
      });

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(0);
    });
  });

  describe('Admin banned providers movies => Update banned provider movie', () => {
    it('Admin should ban movie then update banned movie', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result2.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result2.body.items[0].movieName).toBe(
        ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA.movieName,
      );
    });

    it('Admin should ban movie then update banned movie after that unban movie and update again then should get not found error', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result2.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result2.body.items[0].movieName).toBe(
        ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA.movieName,
      );

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result3 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result3.body).toBeDefined();
      expect(result3.body.items).toHaveLength(0);

      const notFoundResult = await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      expect(notFoundResult.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'bannedProviderMovieId',
            errorKey: EXCEPTION_KEYS_ENUM.BANNED_PROVIDER_MOVIE_NOT_FOUND,
          },
        ],
      });
    });

    it('Admin should ban movie then should not update banned movie, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      const unResult = await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);

      expect(unResult.body).toEqual({
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

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result2.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result2.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);
    });

    it('Admin should ban movie then should not update banned movie, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const getResult1 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(getResult1.body).toBeDefined();
      expect(getResult1.body.items).toHaveLength(1);
      expect(getResult1.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(getResult1.body.items[0].providerId).toBe(
        ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId,
      );
      expect(getResult1.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      const result1 = await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send({})
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });

      const result2 = await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send({ movieName: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });

      const result3 = await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/1`)
        .send({
          ...ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
          movieName:
            'njrfnjnfjkrnrjksnjsrfmkrflkfrjnrjfnrjkrfnjkrnjkfnrjknrfjnjrfnjkrfnjkfrnjkfrnjnfrjknfrjknfjrknrjfkjhkfrbhfrbhrfbhjfbrhjbfrhjhjfrbhjfrbhjbfrhjbhrfjhjrbfhjrfbhfrbhjbrfhjbhrfnjknfrjjnknrsjknrjksnjfkrsnjksfrnjksfrnjkjnkrfsnkjrs',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });

      const result4 = await request(app.getHttpServer())
        .put(`${baseBannedProviderMovieTokenUri}/one`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result4.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'bannedProviderMovieId',
            errorKey: EXCEPTION_KEYS_ENUM.bannedProviderMovieId,
          },
        ],
      });

      const getResult2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(getResult2.body).toBeDefined();
      expect(getResult2.body.items).toHaveLength(1);
      expect(getResult2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(getResult2.body.items[0].providerId).toBe(
        ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId,
      );
      expect(getResult2.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);
    });
  });

  describe('Admin banned providers movies => Get banned provider movie', () => {
    it('Admin should ban 3 movie then update banned movie 1 and get movies with correct data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);
      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({
          isBan: true,
          movieName: 'movie2',
          providerId: '123456789',
          provider: TorApiProvidersEnum.RUTRACKER,
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);
      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send({
          isBan: true,
          movieName: 'movie3',
          providerId: '99999',
          provider: TorApiProvidersEnum.RUTOR,
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result1 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query(ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result1.body).toEqual({
        totalCount: 3,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result1.body.items).toHaveLength(3);
      expect(result1.body.items[0]).toEqual({
        id: 3,
        provider: TorApiProvidersEnum.RUTOR,
        providerId: '99999',
        movieName: 'movie3',
        createdAt: expect.any(String),
      });

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, size: 1 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 3,
        pagesCount: 3,
        page: 1,
        size: 1,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0]).toEqual({
        id: 3,
        provider: TorApiProvidersEnum.RUTOR,
        providerId: '99999',
        movieName: 'movie3',
        createdAt: expect.any(String),
      });

      const result3 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, size: 1, page: 2 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result3.body).toEqual({
        totalCount: 3,
        pagesCount: 3,
        page: 2,
        size: 1,
        items: expect.any(Array),
      });
      expect(result3.body.items).toHaveLength(1);
      expect(result3.body.items[0]).toEqual({
        id: 2,
        provider: TorApiProvidersEnum.RUTRACKER,
        providerId: '123456789',
        movieName: 'movie2',
        createdAt: expect.any(String),
      });

      const result4 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({
          ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
          provider: TorApiProvidersEnum.RUTOR,
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result4.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result4.body.items).toHaveLength(1);
      expect(result4.body.items[0]).toEqual({
        id: 3,
        provider: TorApiProvidersEnum.RUTOR,
        providerId: '99999',
        movieName: 'movie3',
        createdAt: expect.any(String),
      });

      const result5 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({
          ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
          providerId: '1234',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result5.body).toEqual({
        totalCount: 2,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result5.body.items).toHaveLength(2);
    });

    it('Admin should ban movie then should not get banned movies, bad page', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, page: 30 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result.body).toEqual({
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
    });

    it('Admin should ban movie then should not get banned movie, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const unResult = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query(ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);

      expect(unResult.body).toEqual({
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

    it('Admin should ban movie then should not get banned movie, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseBannedProviderMovieTokenUri}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result1 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, page: 2000 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result1.body).toEqual({
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

      const result2 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, page: 'hundred' })
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
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, size: 'hundred' })
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

      const result4 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, provider: 'provider' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result4.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.provider,
          },
        ],
      });

      const result5 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, provider: '      ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result5.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.provider,
          },
        ],
      });

      const result6 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({ ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA, providerId: '      ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result6.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.providerId,
          },
        ],
      });

      const result7 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({
          ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
          providerId:
            'rmkfrjnrfjmfrjnjfrjnkfrjfnrjkrfnjkfrnjknfrjknjkfrnjkrfnjkrfnjkfrnjknrfjnfrjknjkrfnjrfnjkrfnkjfrjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result7.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.providerId,
          },
        ],
      });

      const result8 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({
          ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
          movieName:
            'rmkfrjnrfjmfrjnjfrjnkfrjfnrjkrfnjkfrnjknfrjknjkfrnjkrfnjkrfnjkfrnjknrfjnfrjknjkrfnjrfnjkrfnkjfrjkrmkfrjnrfjmfrjnjfrjnkfrjfnrjkrfnjkfrnjknfrjknjkfrnjkrfnjkrfnjkfrnjknrfjnfrjknjkrfnjrfnjkrfnkjfrjkrmkfrjnrfjmfrjnjfrjnkfrjfnrjkrfnjkfrnjknfrjknjkfrnjkrfnjkrfnjkfrnjknrfjnfrjknjkrfnjrfnjkrfnkjfrjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result8.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });

      const result9 = await request(app.getHttpServer())
        .get(`${baseBannedProviderMovieTokenUri}`)
        .query({
          ...ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
          movieName: '       ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result9.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'movieName',
            errorKey: EXCEPTION_KEYS_ENUM.movieName,
          },
        ],
      });
    });
  });
});
