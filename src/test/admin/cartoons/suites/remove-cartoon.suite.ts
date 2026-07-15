import * as request from 'supertest';
import { TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA } from '../../../data/admin-cinema.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminCinemaCartoonsSuiteContext } from '../admin-cinema-cartoons-suite-context';

export function registerAdminCinemaCartoonsRemoveSuite({
  getApp,
  getLoginByMainAdmin,
  createMovieFactory,
  getAdminCinemaCartoonsUrl,
}: AdminCinemaCartoonsSuiteContext): void {
  describe('Admin cinema - cartoons => Remove cartoon', () => {
    it('Admin should remove cartoon by id', async () => {
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

      await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaCartoonsUrl()}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 0,
        pagesCount: 0,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(0);
    });

    it('Admin should not remove cartoon by id, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaCartoonsUrl()}/1`)
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

    it('Admin should not remove cartoon by id, film not found', async () => {
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

      await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaCartoonsUrl()}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaCartoonsUrl()}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 0,
        pagesCount: 0,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(0);

      const notFoundResult = await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaCartoonsUrl()}/1`)
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

    it('Admin should not remove cartoon by id, bad input data', async () => {
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

      const badRequestResult = await request(getApp().getHttpServer())
        .delete(`${getAdminCinemaCartoonsUrl()}/filmId`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badRequestResult.body).toEqual({
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
    });
  });
}
