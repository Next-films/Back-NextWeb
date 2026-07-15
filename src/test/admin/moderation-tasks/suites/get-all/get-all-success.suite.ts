import * as request from 'supertest';
import { ModerationMovieTypeStatusEnum } from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { MovieTypesEnum } from '@/common/types/types';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { TEST_MODERATION_GET_ALL_DATA } from '../../../../data/moderation-tasks.test.data';
import { ModerationTasksGetAllSuiteContext } from '../get-all-moderation-tasks.suite';

export function registerModerationTasksGetAllSuccessSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  createMovieAndTasks,
}: ModerationTasksGetAllSuiteContext): void {
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
}
