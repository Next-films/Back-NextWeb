import * as request from 'supertest';
import { MovieHandleStatus } from '@/movies/domain/types';
import {
  TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
  TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA,
} from '../../../data/admin-cinema.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminCinemaCartoonsSuiteContext } from '../admin-cinema-cartoons-suite-context';

export function registerAdminCinemaCartoonsShowOrHideSuite({
  getApp,
  getTestService,
  getLoginByMainAdmin,
  createMovieFactory,
  getAdminCinemaCartoonsUrl,
  getModerationCartoonRepository,
  getTelegramAdminBotService,
}: AdminCinemaCartoonsSuiteContext): void {
  describe('Admin cinema - cartoons => Show or hide cartoon', () => {
    it('Admin should hide then show cartoon then hide cartoon and create moderation request', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
          .patch(`${getAdminCinemaCartoonsUrl()}/1`)
          .send(TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy1).not.toHaveBeenCalled();
      } finally {
        notifySpy1.mockRestore();
      }

      const moderationResult1 = await getModerationCartoonRepository().getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(0);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
          .patch(`${getAdminCinemaCartoonsUrl()}/1`)
          .send({ isHidden: false, isModerate: false })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy2).not.toHaveBeenCalled();
      } finally {
        notifySpy2.mockRestore();
      }

      const moderationResult2 = await getModerationCartoonRepository().getAllModeration();

      expect(moderationResult2).toBeDefined();
      expect(moderationResult2).toHaveLength(0);

      const result3 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
          .patch(`${getAdminCinemaCartoonsUrl()}/1`)
          .send({ isHidden: true, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy3).toHaveBeenCalled();
      } finally {
        notifySpy3.mockRestore();
      }

      const result4 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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

      const moderationResult3 = await getModerationCartoonRepository().getAllModeration();

      expect(moderationResult3).toBeDefined();
      expect(moderationResult3).toHaveLength(1);

      expect(moderationResult3[0].movieId).toBe(result4.body.items[0].id);
    });

    it('Admin should not show or hide cartoon, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA)
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

    it('Admin should hide cartoon then remove cartoon and should not show cartoon again, cartoon not found', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
        .send(TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const moderationResult1 = await getModerationCartoonRepository().getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(0);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
        .delete(`${getAdminCinemaCartoonsUrl()}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const notFoundResult = await request(getApp().getHttpServer())
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
        .send({ isHidden: false, isModerate: false })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      expect(notFoundResult.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'cartoonId',
            errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
          },
        ],
      });
    });

    it('Admin should hide or show cartoon, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/1`)
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
        .patch(`${getAdminCinemaCartoonsUrl()}/filmId`)
        .send({ isHidden: true, isModerate: true })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult6.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'cartoonId',
            errorKey: EXCEPTION_KEYS_ENUM.cartoonId,
          },
        ],
      });

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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

    it('Admin should hide cartoon with moderation then should not hide with moderation again, cartoon under moderation', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Film');

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
          .patch(`${getAdminCinemaCartoonsUrl()}/1`)
          .send({ ...TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await getTestService().delay(1000);
        expect(notifySpy1).toHaveBeenCalled();
      } finally {
        notifySpy1.mockRestore();
      }

      const moderationResult1 = await getModerationCartoonRepository().getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(1);

      expect(moderationResult1[0].id).toBe(result.body.items[0].id);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
          .patch(`${getAdminCinemaCartoonsUrl()}/1`)
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

      const moderationResult2 = await getModerationCartoonRepository().getAllModeration();

      expect(moderationResult2).toBeDefined();
      expect(moderationResult2).toHaveLength(1);

      const result3 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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
