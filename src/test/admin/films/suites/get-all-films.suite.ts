import * as request from 'supertest';
import { MovieHandleStatus } from '@/movies/domain/types';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA } from '../../../data/admin-cinema.test.data';
import {
  AdminGetFilmsSortFieldEnum,
  AdminGetFilmsStatusEnum,
} from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminCinemaFilmsSuiteContext } from '../admin-cinema-films-suite-context';

export function registerAdminCinemaFilmsGetAllSuite({
  getApp,
  getLoginByMainAdmin,
  createMovieFactory,
  getAdminCinemaFilmsUrl,
}: AdminCinemaFilmsSuiteContext): void {
  describe('Admin cinema - films => Get all', () => {
    it('Admin should get all films, with correct data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieFactory().createProductionMovie(1, 'Movie 1');
      await createMovieFactory().createProductionMovie(
        2,
        'Movie 2',
        ['Драмма', 'Фантастика'],
        new Date('2022-01-05').toISOString(),
        3000,
        ['Германия', 'Франция'],
      );
      await createMovieFactory().createModerationMovie(3, 'Movie 3');
      await createMovieFactory().createModerationMovie(4, 'Movie 4');
      await createMovieFactory().createModerationMovie(5, 'Movie 5');
      await createMovieFactory().createProcessingMovies(['6'], ['Movie 6']);

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 6,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(6);

      const resultPageSize = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, size: 1 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultPageSize.body).toEqual({
        totalCount: 6,
        pagesCount: 6,
        page: 1,
        size: 1,
        items: expect.any(Array),
      });
      expect(resultPageSize.body.items).toHaveLength(1);

      const resultPage = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, size: 1, page: 3 })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultPage.body).toEqual({
        totalCount: 6,
        pagesCount: 6,
        page: 3,
        size: 1,
        items: expect.any(Array),
      });
      expect(resultPage.body.items).toHaveLength(1);

      const [resultSort1, resultSort2] = await Promise.all([
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, sortDirection: SortDirectionEnum.DESC })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, sortDirection: SortDirectionEnum.ASC })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
      ]);

      expect(resultSort1.body).toEqual({
        totalCount: 6,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSort1.body.items).toHaveLength(6);
      expect(resultSort2.body).toEqual({
        totalCount: 6,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSort2.body.items).toHaveLength(6);

      const resultSortEl1 = resultSort1.body.items[0];
      const resultSortEl2 = resultSort2.body.items[0];

      expect(resultSortEl1.id).not.toBe(resultSortEl2.id);

      const [resultSortField1, resultSortField2] = await Promise.all([
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({
            ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
            sortField: AdminGetFilmsSortFieldEnum.TITLE,
            sortDirection: SortDirectionEnum.ASC,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({
            ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
            sortField: AdminGetFilmsSortFieldEnum.RELEASE_DATE,
            sortDirection: SortDirectionEnum.ASC,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
      ]);

      expect(resultSortField1.body).toEqual({
        totalCount: 6,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSortField1.body.items).toHaveLength(6);
      expect(resultSortField2.body).toEqual({
        totalCount: 6,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSortField2.body.items).toHaveLength(6);

      const resultSortFieldEl1 = resultSortField1.body.items[0];
      const resultSortFieldEl2 = resultSortField2.body.items[0];

      expect(resultSortFieldEl1.id).not.toBe(resultSortFieldEl2.id);

      const [resultStatus1, resultStatus2, resultStatus3, resultStatus4] = await Promise.all([
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({
            ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.ALL,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({
            ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.PRODUCTION,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({
            ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.MODERATE,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({
            ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.PROCESSING,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
      ]);

      expect(resultStatus1.body).toEqual({
        totalCount: 6,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatus1.body.items).toHaveLength(6);
      expect(resultStatus2.body).toEqual({
        totalCount: 2,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatus2.body.items).toHaveLength(2);
      expect(resultStatus3.body).toEqual({
        totalCount: 3,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatus3.body.items).toHaveLength(3);
      expect(resultStatus4.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultStatus4.body.items).toHaveLength(1);

      const resultStatusEl1 = resultStatus1.body.items[0];
      const resultStatusEl2 = resultStatus2.body.items[0];
      const resultStatusEl3 = resultStatus3.body.items[0];

      expect(resultStatusEl1.id).not.toBe(resultStatusEl2.id);
      //expect(resultStatusEl1.id).not.toBe(resultStatusEl3.id);

      expect(resultStatusEl2.id).not.toBe(resultStatusEl3.id);

      const [resultSearchByName1, resultSearchByName2] = await Promise.all([
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, searchName: 'Movie 2' })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(getApp().getHttpServer())
          .get(`${getAdminCinemaFilmsUrl()}`)
          .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, searchName: 'Movie 4' })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
      ]);

      expect(resultSearchByName1.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSearchByName1.body.items).toHaveLength(1);
      expect(resultSearchByName2.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultSearchByName2.body.items).toHaveLength(1);

      const resultSearchByNameEl1 = resultSearchByName1.body.items[0];
      const resultSearchByNameEl2 = resultSearchByName2.body.items[0];

      expect(resultSearchByNameEl1.id).not.toBe(resultSearchByNameEl2.id);

      expect(resultSearchByNameEl1).toEqual({
        id: 2,
        kpId: '2',
        name: 'Movie 2 2',
        isHidden: false,
        description: 'Desc 2',
        duration: 3000,
        country: ['Германия', 'Франция'],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        genres: [
          { id: expect.any(Number), name: 'драмма' },
          { id: expect.any(Number), name: 'фантастика' },
        ],
        releaseDate: '2022-01-05',
        originalTitle: 'En name 2',
        alternativeTitles: 'Movie 2 2 Alt name 2 En name 2',
        status: MovieHandleStatus.PRODUCTION,
        content: {
          movieUrl: 'https://video.com/2',
          trailerUrl: 'https://trailer.com/2',
          previewUrl: expect.any(String),
          backgroundUrl: expect.any(String),
          titleUrl: expect.any(String),
        },
      });

      expect(resultSearchByNameEl2).toEqual({
        id: 4,
        kpId: '4',
        name: 'Movie 4 4',
        isHidden: true,
        description: 'Desc 4',
        duration: 1000,
        country: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        genres: expect.any(Array),
        releaseDate: null,
        originalTitle: 'En name 4',
        alternativeTitles: 'Movie 4 4 Alt name 4 En name 4',
        status: MovieHandleStatus.MODERATE,
        content: {
          movieUrl: 'https://video.com/4',
          trailerUrl: null,
          previewUrl: null,
          backgroundUrl: null,
          titleUrl: null,
        },
      });
    });

    it('Admin should not get all films, unauthorized', async () => {
      const result = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
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

    it('Admin should not get all films, bad page', async () => {
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

      const result2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, page: 30 })
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

    it('Admin should not get all films, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const resultPage1 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, page: 1000000000 })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, page: 'page' })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, size: 'size' })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, size: 1000000000 })
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

      const resultStatus1 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, status: 'status' })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, status: '      ' })
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

      const resultSort1 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, sortDirection: 'SortDirectionEnum' })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, sortDirection: '        ' })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, searchName: '        ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSearchMovieName1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'searchName',
            errorKey: EXCEPTION_KEYS_ENUM.searchName,
          },
        ],
      });

      const resultSearchMovieName2 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, searchName: '' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSearchMovieName2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'searchName',
            errorKey: EXCEPTION_KEYS_ENUM.searchName,
          },
        ],
      });

      const resultSearchMovieName3 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({
          ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
          searchName:
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
            field: 'searchName',
            errorKey: EXCEPTION_KEYS_ENUM.searchName,
          },
        ],
      });

      const resultSortField1 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, sortField: 'sortField' })
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
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, sortField: '      ' })
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

      const resultSearchGenreIds1 = await request(getApp().getHttpServer())
        .get(`${getAdminCinemaFilmsUrl()}`)
        .query({ ...TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA, searchGenreIds: [' ', ['genre']] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultSearchGenreIds1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'searchGenreIds',
            errorKey: EXCEPTION_KEYS_ENUM.searchGenreIds,
          },
        ],
      });
    });
  });
}
