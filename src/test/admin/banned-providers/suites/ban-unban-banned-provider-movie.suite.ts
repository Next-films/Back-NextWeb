import * as request from 'supertest';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA,
} from '../../../data/admin-banned-providers-movie.test.data';
import { AdminBannedProvidersSuiteContext } from '../admin-banned-providers-suite-context';

export function registerAdminBannedProvidersBanUnbanSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseBannedProviderMovieTokenUri,
}: AdminBannedProvidersSuiteContext): void {
  describe('Admin banned providers movies => Ban/Unban provider movie', () => {
    it('Admin should ban movie', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
    });

    it('Admin should ban movie then ban again', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result2.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
    });

    it('Admin should ban movie then unban movie ', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(0);
    });

    it('Admin should not ban movie, unauthorized', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const resultUnauthorized = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(0);
    });

    it('Admin should not ban movie, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result1 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result2 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result3 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result4 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result5 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result6 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result7 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result8 = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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
      const { accessToken } = await getLoginByMainAdmin()();

      const badResult = await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toBeDefined();
      expect(result.body.items).toHaveLength(0);
    });
  });
}
