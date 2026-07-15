import * as request from 'supertest';
import { MovieHandleStatus } from '@/movies/domain/types';
import {
  TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
  TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA,
} from '../../../data/admin-cinema.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminCinemaFilmsSuiteContext } from '../admin-cinema-films-suite-context';

export function registerAdminCinemaFilmsShowOrHideSuite({
  getApp,
  getTestService,
  getLoginByMainAdmin,
  createMovieFactory,
  getAdminCinemaFilmsUrl,
  getModerationFilmRepository,
  getTelegramAdminBotService,
}: AdminCinemaFilmsSuiteContext): void {
  describe('Admin cinema - films => Show or hide film', () => {
    it('Admin should hide then show film then hide film and create moderation request', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].isHidden).toBeFalsy();
      expect(result.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      const notifySpy1 = jest.spyOn(getTelegramAdminBotService(), 'sendHtmlMessage');

      try {
        await request(getApp().getHttpServer())
          .patch(`${getAdminCinemaFilmsUrl()}/1`)
          .send(TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy1).not.toHaveBeenCalled();
      } finally {
        notifySpy1.mockRestore();
      }

      const moderationResult1 = await getModerationFilmRepository().getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(0);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].isHidden).toBeTruthy();
      expect(result2.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      const notifySpy2 = jest.spyOn(getTelegramAdminBotService(), 'sendHtmlMessage');

      try {
        await request(getApp().getHttpServer())
          .patch(`${getAdminCinemaFilmsUrl()}/1`)
          .send({ isHidden: false, isModerate: false })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy2).not.toHaveBeenCalled();
      } finally {
        notifySpy2.mockRestore();
      }

      const moderationResult2 = await getModerationFilmRepository().getAllModeration();

      expect(moderationResult2).toBeDefined();
      expect(moderationResult2).toHaveLength(0);

      const result3 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result3.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result3.body.items).toHaveLength(1);
      expect(result3.body.items[0].isHidden).toBeFalsy();
      expect(result3.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      const notifySpy3 = jest.spyOn(getTelegramAdminBotService(), 'sendHtmlMessage');

      try {
        await request(getApp().getHttpServer())
          .patch(`${getAdminCinemaFilmsUrl()}/1`)
          .send({ isHidden: true, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy3).toHaveBeenCalled();
      } finally {
        notifySpy3.mockRestore();
      }

      const result4 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
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
      expect(result4.body.items[0].isHidden).toBeTruthy();
      expect(result4.body.items[0].status).toBe(MovieHandleStatus.MODERATE);

      const moderationResult3 = await getModerationFilmRepository().getAllModeration();

      expect(moderationResult3).toBeDefined();
      expect(moderationResult3).toHaveLength(1);

      expect(moderationResult3[0].movieId).toBe(result4.body.items[0].id);
    });

    it('Admin should not show or hide film, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA)
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

    it('Admin should hide film then remove film and should not show film again, film not found', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].isHidden).toBeFalsy();
      expect(result.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const moderationResult1 = await getModerationFilmRepository().getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(0);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].isHidden).toBeTruthy();
      expect(result2.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaFilmsUrl()}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const notFoundResult = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ isHidden: false, isModerate: false })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      expect(notFoundResult.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'filmId',
            errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
          },
        ],
      });
    });

    it('Admin should hide or show film, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].isHidden).toBeFalsy();
      expect(result.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      const badResult1 = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send({})
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isHidden',
            errorKey: EXCEPTION_KEYS_ENUM.isHidden,
          },
          {
            message: expect.any(String),
            field: 'isModerate',
            errorKey: EXCEPTION_KEYS_ENUM.isModerate,
          },
        ],
      });

      const badResult2 = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ isHidden: true })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isModerate',
            errorKey: EXCEPTION_KEYS_ENUM.isModerate,
          },
        ],
      });

      const badResult3 = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ isModerate: false })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isHidden',
            errorKey: EXCEPTION_KEYS_ENUM.isHidden,
          },
        ],
      });

      const badResult4 = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ isModerate: 'moderate', isHidden: true })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult4.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isModerate',
            errorKey: EXCEPTION_KEYS_ENUM.isModerate,
          },
        ],
      });

      const badResult5 = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/1`)
        .send({ isHidden: 'isHidden', isModerate: true })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult5.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'isHidden',
            errorKey: EXCEPTION_KEYS_ENUM.isHidden,
          },
        ],
      });

      const badResult6 = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaFilmsUrl()}/filmId`)
        .send({ isHidden: true, isModerate: true })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult6.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'filmId',
            errorKey: EXCEPTION_KEYS_ENUM.filmId,
          },
        ],
      });

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].isHidden).toBeFalsy();
      expect(result2.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);
    });

    it('Admin should hide film with moderation then should not hide with moderation again, film under moderation', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0].isHidden).toBeFalsy();
      expect(result.body.items[0].status).toBe(MovieHandleStatus.PRODUCTION);

      const notifySpy1 = jest.spyOn(getTelegramAdminBotService(), 'sendHtmlMessage');

      try {
        await request(getApp().getHttpServer())
          .patch(`${getAdminCinemaFilmsUrl()}/1`)
          .send({ ...TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy1).toHaveBeenCalled();
      } finally {
        notifySpy1.mockRestore();
      }

      const moderationResult1 = await getModerationFilmRepository().getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(1);

      expect(moderationResult1[0].id).toBe(result.body.items[0].id);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(1);
      expect(result2.body.items[0].isHidden).toBeTruthy();
      expect(result2.body.items[0].status).toBe(MovieHandleStatus.MODERATE);

      const notifySpy2 = jest.spyOn(getTelegramAdminBotService(), 'sendHtmlMessage');

      try {
        const badResult = await request(getApp().getHttpServer())
          .patch(`${getAdminCinemaFilmsUrl()}/1`)
          .send({ isHidden: true, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400);

        expect(badResult.body).toEqual({
          message: expect.any(String),
          statusCode: 400,
          errorField: [
            {
              message: expect.any(String),
              field: 'isModerate',
              errorKey: EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_UNDER_MODERATION,
            },
          ],
        });

        await getTestService().delay(1000);
        expect(notifySpy2).not.toHaveBeenCalled();
      } finally {
        notifySpy2.mockRestore();
      }

      const moderationResult2 = await getModerationFilmRepository().getAllModeration();

      expect(moderationResult2).toBeDefined();
      expect(moderationResult2).toHaveLength(1);

      const result3 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result3.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result3.body.items).toHaveLength(1);
      expect(result3.body.items[0].isHidden).toBeTruthy();
      expect(result3.body.items[0].status).toBe(MovieHandleStatus.MODERATE);
    });
  });
}
