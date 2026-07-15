import * as request from 'supertest';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum } from '@/common/types/types';
import { TEST_MODERATION_GET_ALL_DATA } from '../../../../data/moderation-tasks.test.data';
import { ModerationTasksGetAllSuiteContext } from '../get-all-moderation-tasks.suite';

export function registerModerationTasksGetAllValidationSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  createMovieAndTasks,
}: ModerationTasksGetAllSuiteContext): void {
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
}
