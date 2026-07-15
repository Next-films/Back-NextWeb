import * as request from 'supertest';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA,
  ADMIN_GET_BANNED_PROVIDER_MOVIE_TEST_DATA,
} from '../../../data/admin-banned-providers-movie.test.data';
import { TorApiProvidersEnum } from '@/common/types/types';
import { AdminBannedProvidersSuiteContext } from '../admin-banned-providers-suite-context';

export function registerAdminBannedProvidersGetSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseBannedProviderMovieTokenUri,
}: AdminBannedProvidersSuiteContext): void {
  describe('Admin banned providers movies => Get banned provider movie', () => {
    it('Admin should ban 3 movie then update banned movie 1 and get movies with correct data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);
      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send({
          isBan: true,
          movieName: 'movie2',
          providerId: '123456789',
          provider: TorApiProvidersEnum.RUTRACKER,
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);
      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send({
          isBan: true,
          movieName: 'movie3',
          providerId: '99999',
          provider: TorApiProvidersEnum.RUTOR,
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result1 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result2 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result3 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result4 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result5 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const unResult = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseBannedProviderMovieTokenUri()}`)
        .send(ADMIN_BAN_PROVIDER_MOVIE_TEST_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result1 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result2 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result3 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result4 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result5 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result6 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result7 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result8 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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

      const result9 = await request(getApp().getHttpServer())
        .get(`${getBaseBannedProviderMovieTokenUri()}`)
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
}
