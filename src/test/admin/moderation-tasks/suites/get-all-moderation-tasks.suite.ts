import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ModerationMovieTypeStatusEnum } from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum } from '@/common/types/types';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { TEST_MODERATION_GET_ALL_DATA } from '../../../data/moderation-tasks.test.data';

export type ModerationTasksGetAllSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminModerationTaskUrl: () => string;
  createMovieAndTasks: (...args: any[]) => Promise<void>;
};

export function registerModerationTasksGetAllSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  createMovieAndTasks,
}: ModerationTasksGetAllSuiteContext): void {
  describe('Admin moderation tasks => Get all', () => {
    it('Admin should get all moderation tasks, with correct data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(5, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query(TEST_MODERATION_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 5,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(5);
      expect(result.body.items[0]).toEqual({
        id: expect.any(Number),
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: expect.any(Number),
          name: expect.any(String),
        },
      });

      const resultPageSize = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, size: 1 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultPageSize.body).toEqual({
        totalCount: 5,
        pagesCount: 5,
        page: 1,
        size: 1,
        items: expect.any(Array),
      });
      expect(resultPageSize.body.items).toHaveLength(1);

      const resultPage = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, size: 1, page: 3 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultPage.body).toEqual({
        totalCount: 5,
        pagesCount: 5,
        page: 3,
        size: 1,
        items: expect.any(Array),
      });
      expect(resultPage.body.items).toHaveLength(1);

      const resultCartoonType = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoonType.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultCartoonType.body.items).toHaveLength(1);

      const resultSort = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, sortDirection: SortDirectionEnum.ASC })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultSort.body).toEqual({
        totalCount: 5,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSort.body.items).toHaveLength(5);

      const resultSortEl1 = result.body.items[0];
      const resultSortEl2 = resultSort.body.items[0];

      expect(resultSortEl1.id).not.toBe(resultSortEl2.id);

      const resultSearchMovieName = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, searchMovieName: 'Movie 1' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultSearchMovieName.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSearchMovieName.body.items).toHaveLength(1);
      expect(resultSearchMovieName.body.items[0]).toEqual({
        id: expect.any(Number),
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: expect.any(Number),
          name: 'Movie 1',
        },
      });

      const resultStatusAccepted1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: ModerationMovieTypeStatusEnum.ACCEPTED })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultStatusAccepted1.body).toEqual({
        totalCount: 0,
        pagesCount: 0,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatusAccepted1.body.items).toHaveLength(0);

      const resultStatusPending1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: ModerationMovieTypeStatusEnum.PENDING })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultStatusPending1.body).toEqual({
        totalCount: 5,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatusPending1.body.items).toHaveLength(5);

      const resultStatusAll1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: ModerationMovieTypeStatusEnum.ALL })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultStatusAll1.body).toEqual({
        totalCount: 5,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatusAll1.body.items).toHaveLength(5);

      await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultStatusAccepted2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: ModerationMovieTypeStatusEnum.ACCEPTED })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultStatusAccepted2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatusAccepted2.body.items).toHaveLength(1);

      const resultStatusPending2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: ModerationMovieTypeStatusEnum.PENDING })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultStatusPending2.body).toEqual({
        totalCount: 4,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatusPending2.body.items).toHaveLength(4);

      const resultStatusAll2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: ModerationMovieTypeStatusEnum.ALL })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultStatusAll2.body).toEqual({
        totalCount: 5,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatusAll2.body.items).toHaveLength(5);
    });

    it('Admin should not get all moderation tasks, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query(TEST_MODERATION_GET_ALL_DATA)
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

    it('Admin should get all moderation tasks, bad page', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(5, MovieTypesEnum.FILM);

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query(TEST_MODERATION_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 5,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(5);

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, page: 30 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
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

    it('Admin should not get all moderation tasks, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const resultPage1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, page: 1000000000 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultPage1.body).toEqual({
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

      const resultPage2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, page: 'page' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultPage2.body).toEqual({
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

      const resultSize1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, size: 'size' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSize1.body).toEqual({
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

      const resultSize2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, size: 1000000000 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSize2.body).toEqual({
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

      const resultType1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, type: 'type' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultType1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'type',
            errorKey: EXCEPTION_KEYS_ENUM.type,
          },
        ],
      });

      const resultType2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, type: '      ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultType2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'type',
            errorKey: EXCEPTION_KEYS_ENUM.type,
          },
        ],
      });

      const resultSort1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, sortDirection: 'SortDirectionEnum' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSort1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'sortDirection',
            errorKey: EXCEPTION_KEYS_ENUM.sortDirection,
          },
        ],
      });

      const resultSort2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, sortDirection: '        ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSort2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'sortDirection',
            errorKey: EXCEPTION_KEYS_ENUM.sortDirection,
          },
        ],
      });

      const resultSearchMovieName1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, searchMovieName: '        ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSearchMovieName1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'searchMovieName',
            errorKey: EXCEPTION_KEYS_ENUM.searchMovieName,
          },
        ],
      });

      const resultSearchMovieName2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, searchMovieName: '' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSearchMovieName2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'searchMovieName',
            errorKey: EXCEPTION_KEYS_ENUM.searchMovieName,
          },
        ],
      });

      const resultSearchMovieName3 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({
          ...TEST_MODERATION_GET_ALL_DATA,
          searchMovieName:
            'njrnjkrfnjkrfnjknrfsjknjrksfnjkrsfnjkrfsnjkrfsbhkrfbhjrfsbvjkrsfvgrvfsghvrgfhsvghrfsvhgrfvghrsfvghrsfvhgrfsvghrsfvgrfsvrfsghjvrfsghvrsfghvghrsfvghfrsvghjrsf',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSearchMovieName3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'searchMovieName',
            errorKey: EXCEPTION_KEYS_ENUM.searchMovieName,
          },
        ],
      });

      const resultStatus1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: '      ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultStatus1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'status',
            errorKey: EXCEPTION_KEYS_ENUM.status,
          },
        ],
      });

      const resultStatus2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, status: 'status' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultStatus2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'status',
            errorKey: EXCEPTION_KEYS_ENUM.status,
          },
        ],
      });

      const resultSortField1 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, sortField: 'sortField' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSortField1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'sortField',
            errorKey: EXCEPTION_KEYS_ENUM.sortField,
          },
        ],
      });

      const resultSortField2 = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}`)
        .query({ ...TEST_MODERATION_GET_ALL_DATA, sortField: '      ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSortField2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'sortField',
            errorKey: EXCEPTION_KEYS_ENUM.sortField,
          },
        ],
      });
    });
  });
}
