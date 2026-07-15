import * as request from 'supertest';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA,
} from '../../../data/admin-banned-providers-movie.test.data';
import { AdminBannedProvidersSuiteContext } from '../admin-banned-providers-suite-context';

export function registerAdminBannedProvidersUpdateSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseBannedProviderMovieTokenUri,
}: AdminBannedProvidersSuiteContext): void {
  describe('Admin banned providers movies => Update banned provider movie', () => {
    it('Admin should ban movie then update banned movie', async () => {
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
      expect(result.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
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
      expect(result2.body.items[0].movieName).toBe(
        ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA.movieName,
      );
    });

    it('Admin should ban movie then update banned movie after that unban movie and update again then should get not found error', async () => {
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
      expect(result.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
        .send(ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA)
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
      expect(result2.body.items[0].movieName).toBe(
        ADMIN_UPDATE_BANNED_PROVIDER_MOVIE_TEST_DATA.movieName,
      );

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_UNBAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result3 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result3.body).toBeDefined();
      expect(result3.body.items).toHaveLength(0);

      const notFoundResult = await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
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
      expect(result.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      const unResult = await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
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

      const result2 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toBeDefined();
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(result2.body.items[0].providerId).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId);
      expect(result2.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);
    });

    it('Admin should ban movie then should not update banned movie, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const getResult1 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(getResult1.body).toBeDefined();
      expect(getResult1.body.items).toHaveLength(1);
      expect(getResult1.body.items[0].provider).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.provider);
      expect(getResult1.body.items[0].providerId).toBe(
        ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.providerId,
      );
      expect(getResult1.body.items[0].movieName).toBe(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA.movieName);

      const result1 = await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
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

      const result2 = await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
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

      const result3 = await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/1`)
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

      const result4 = await request(getApp().getHttpServer())
        .put(`${getBaseBannedProviderMovieTokenUri()}/one`)
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

      const getResult2 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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
}
