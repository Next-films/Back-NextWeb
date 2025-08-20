import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { ADMIN_AUTH_ROUTES, ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { adminLogin } from '../../utils/auth/admin-login';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import * as request from 'supertest';
import { MovieHandleStatus } from '@/movies/domain/types';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
  TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA,
  TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA,
} from '../../data/admin-cinema.test.data';
import { CommandBus } from '@nestjs/cqrs';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  AdminGetFilmsSortFieldEnum,
  AdminGetFilmsStatusEnum,
} from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { NewCartoonNotificationPayloadDto } from '@/cartoons/api/dtos/input/new-cartoon-notification.input.dto';
import { NewCartoonNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import { NewCartoonIsHandleNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';

describe('Admin cinema - cartoons', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let adminCinemaCartoonsUrl: string;
  let commandBus: CommandBus;
  let kinopoiskService: KinopoiskService;
  let moderationCartoonRepository: ModerationCartoonRepository;
  let telegramAdminBotService: TelegramAdminBotService;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    const apiSettings = app
      .get(ConfigService<ConfigurationType, true>)
      .get('apiSettings', { infer: true });

    mainAdminLoginData.email = apiSettings.ADMIN_EMAIL;
    mainAdminLoginData.password = apiSettings.ADMIN_PASSWORD;

    baseUri = appUri + ADMIN_AUTH_ROUTES.MAIN;

    adminCinemaCartoonsUrl = appUri + `${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.CARTOONS}`;
    kinopoiskService = app.get(KinopoiskService);
    commandBus = app.get(CommandBus);
    moderationCartoonRepository = app.get(ModerationCartoonRepository);
    telegramAdminBotService = app.get(TelegramAdminBotService);

    loginByMainAdmin = () =>
      adminLogin(app, `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`, mainAdminLoginData);
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateAdminMigration>(GenerateAdminMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  const createMovie = async (
    kpId: number,
    duration: number,
    resolvedValues: KinopoiskMovie,
  ): Promise<void> => {
    const kinopoiskSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskSpy.mockResolvedValue(resolvedValues);

    const payload: NewCartoonNotificationPayloadDto = {
      key: `https://video.com/${kpId}`,
      kpId: String(kpId),
      duration,
    };

    const result = await commandBus.execute<
      NewCartoonNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewCartoonNotificationCommand(payload));

    kinopoiskSpy.mockRestore();

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
  };

  const createProductionMovie = async (
    kpId: number,
    movieName: string,
    genres: string[] = ['Боевик', 'Кримина'],
    releaseDate: string = new Date('01.01.2025').toISOString(),
    duration: number = 1000,
    countries: string[] = ['Беларусь', 'Сша'],
  ): Promise<void> => {
    const resolvedValues: KinopoiskMovie = {
      id: kpId,
      name: `${movieName} ${kpId}`,
      alternativeName: `Alt name ${kpId}`,
      enName: `En name ${kpId}`,
      year: Number(releaseDate.split('.')[0]),
      description: `Desc ${kpId}`,

      logo: {
        url: `http://logo.com/${kpId}`,
      },
      poster: {
        url: `http://poster.com/${kpId}`,
      },
      videos: {
        trailers: [{ site: 'youtube', url: `https://trailer.com/${kpId}` }],
      },

      premiere: {
        world: releaseDate,
      },
      genres: genres.map(g => ({ name: g })),
      countries: countries.map(c => ({ name: c })),
    };

    await createMovie(kpId, duration, resolvedValues);
  };

  const createModerationMovie = async (
    kpId: number,
    movieName: string,
    duration: number = 1000,
  ): Promise<void> => {
    const resolvedValues: KinopoiskMovie = {
      id: kpId,
      name: `${movieName} ${kpId}`,
      alternativeName: `Alt name ${kpId}`,
      enName: `En name ${kpId}`,
      description: `Desc ${kpId}`,
    };

    await createMovie(kpId, duration, resolvedValues);
  };

  const createProcessingMovies = async (kpIds: string[], movieNames: string[]): Promise<void> => {
    const kinopoiskSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    let callIndex = 0;

    // eslint-disable-next-line @typescript-eslint/require-await
    kinopoiskSpy.mockImplementation(async () => {
      const name = movieNames[callIndex] ?? '';
      callIndex++;
      return { name } as KinopoiskMovie;
    });

    const payload: NewMovieIsHandleNotificationPayloadDto = {
      kpIds,
    };

    const result = await commandBus.execute<
      NewCartoonIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewCartoonIsHandleNotificationCommand(payload));

    kinopoiskSpy.mockRestore();

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
  };

  describe('Admin cinema - cartoons => Get all', () => {
    it('Admin should get all cartoons, with correct data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Movie 1');
      await createProductionMovie(
        2,
        'Movie 2',
        ['Драмма', 'Фантастика'],
        new Date('2022-01-05').toISOString(),
        3000,
        ['Германия', 'Франция'],
      );
      await createModerationMovie(3, 'Movie 3');
      await createModerationMovie(4, 'Movie 4');
      await createModerationMovie(5, 'Movie 5');
      await createProcessingMovies(['6'], ['Movie 6']);

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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

      const resultPageSize = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, size: 1 })
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

      const resultPage = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, size: 1, page: 3 })
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
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
            sortDirection: SortDirectionEnum.DESC,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
            sortDirection: SortDirectionEnum.ASC,
          })
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
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
            sortField: AdminGetFilmsSortFieldEnum.TITLE,
            sortDirection: SortDirectionEnum.ASC,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
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
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.ALL,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.PRODUCTION,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
            status: AdminGetFilmsStatusEnum.MODERATE,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({
            ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
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
      expect(resultStatusEl1.id).not.toBe(resultStatusEl3.id);

      expect(resultStatusEl2.id).not.toBe(resultStatusEl3.id);

      const [resultSearchByName1, resultSearchByName2] = await Promise.all([
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, searchName: 'Movie 2' })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(200),
        request(app.getHttpServer())
          .get(`${adminCinemaCartoonsUrl}`)
          .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, searchName: 'Movie 4' })
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

    it('Admin should not get all cartoons, unauthorized', async () => {
      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query(TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA)
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

    it('Admin should not get all cartoons, bad page', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, page: 30 })
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

    it('Admin should not get all cartoons, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const resultPage1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, page: 1000000000 })
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

      const resultPage2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, page: 'page' })
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

      const resultSize1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, size: 'size' })
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

      const resultSize2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, size: 1000000000 })
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

      const resultStatus1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, status: 'status' })
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

      const resultStatus2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, status: '      ' })
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

      const resultSort1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, sortDirection: 'SortDirectionEnum' })
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

      const resultSort2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, sortDirection: '        ' })
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

      const resultSearchMovieName1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, searchName: '        ' })
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

      const resultSearchMovieName2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, searchName: '' })
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

      const resultSearchMovieName3 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({
          ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA,
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

      const resultSortField1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, sortField: 'sortField' })
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

      const resultSortField2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, sortField: '      ' })
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

      const resultSearchGenreIds1 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
        .query({ ...TEST_ADMIN_CINEMA_CARTOON_GET_ALL_DATA, searchGenreIds: [' ', ['genre']] })
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

  describe('Admin cinema - cartoons => Remove cartoon', () => {
    it('Admin should remove cartoon by id', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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
      const result = await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/1`)
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
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const notFoundResult = await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/1`)
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
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const badRequestResult = await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/filmId`)
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

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

  describe('Admin cinema - cartoons => Show or hide cartoon', () => {
    it('Admin should hide then show cartoon then hide cartoon and create moderation request', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const notifySpy1 = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

      try {
        await request(app.getHttpServer())
          .patch(`${adminCinemaCartoonsUrl}/1`)
          .send(TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await testService.delay(1000);
        expect(notifySpy1).not.toHaveBeenCalled();
      } finally {
        notifySpy1.mockRestore();
      }

      const moderationResult1 = await moderationCartoonRepository.getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(0);

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const notifySpy2 = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

      try {
        await request(app.getHttpServer())
          .patch(`${adminCinemaCartoonsUrl}/1`)
          .send({ isHidden: false, isModerate: false })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await testService.delay(1000);
        expect(notifySpy2).not.toHaveBeenCalled();
      } finally {
        notifySpy2.mockRestore();
      }

      const moderationResult2 = await moderationCartoonRepository.getAllModeration();

      expect(moderationResult2).toBeDefined();
      expect(moderationResult2).toHaveLength(0);

      const result3 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const notifySpy3 = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

      try {
        await request(app.getHttpServer())
          .patch(`${adminCinemaCartoonsUrl}/1`)
          .send({ isHidden: true, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await testService.delay(1000);
        expect(notifySpy3).toHaveBeenCalled();
      } finally {
        notifySpy3.mockRestore();
      }

      const result4 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const moderationResult3 = await moderationCartoonRepository.getAllModeration();

      expect(moderationResult3).toBeDefined();
      expect(moderationResult3).toHaveLength(1);

      expect(moderationResult3[0].movieId).toBe(result4.body.items[0].id);
    });

    it('Admin should not show or hide cartoon, unauthorized', async () => {
      const result = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
        .send(TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const moderationResult1 = await moderationCartoonRepository.getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(0);

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const notFoundResult = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const badResult1 = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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

      const badResult2 = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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

      const badResult3 = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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

      const badResult4 = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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

      const badResult5 = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/1`)
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

      const badResult6 = await request(app.getHttpServer())
        .patch(`${adminCinemaCartoonsUrl}/filmId`)
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

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const notifySpy1 = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

      try {
        await request(app.getHttpServer())
          .patch(`${adminCinemaCartoonsUrl}/1`)
          .send({ ...TEST_ADMIN_CINEMA_CARTOON_SHOW_OR_HIDE_DATA, isModerate: true })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        await testService.delay(1000);
        expect(notifySpy1).toHaveBeenCalled();
      } finally {
        notifySpy1.mockRestore();
      }

      const moderationResult1 = await moderationCartoonRepository.getAllModeration();

      expect(moderationResult1).toBeDefined();
      expect(moderationResult1).toHaveLength(1);

      expect(moderationResult1[0].id).toBe(result.body.items[0].id);

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const notifySpy2 = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

      try {
        const badResult = await request(app.getHttpServer())
          .patch(`${adminCinemaCartoonsUrl}/1`)
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

        await testService.delay(1000);
        expect(notifySpy2).not.toHaveBeenCalled();
      } finally {
        notifySpy2.mockRestore();
      }

      const moderationResult2 = await moderationCartoonRepository.getAllModeration();

      expect(moderationResult2).toBeDefined();
      expect(moderationResult2).toHaveLength(1);

      const result3 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

  describe('Admin cinema - cartoon => Update cartoon', () => {
    it('Admin should update cartoon', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const filmResult1 = result.body.items[0];
      expect(result.body.items).toHaveLength(1);
      expect(filmResult1.isHidden).toBeFalsy();
      expect(filmResult1.status).toBe(MovieHandleStatus.PRODUCTION);

      await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send(TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const filmResult2 = result2.body.items[0];
      expect(result2.body.items).toHaveLength(1);
      expect(filmResult2.isHidden).toBeFalsy();
      expect(filmResult2.status).toBe(MovieHandleStatus.PRODUCTION);

      expect(filmResult1.name).not.toBe(filmResult2.name);
      expect(filmResult1.description).not.toBe(filmResult2.description);
      expect(filmResult1.releaseDate).not.toBe(filmResult2.releaseDate);
      expect(filmResult1.duration).not.toBe(filmResult2.duration);
      expect(filmResult1.originalTitle).not.toBe(filmResult2.originalTitle);
      expect(filmResult1.alternativeTitles).not.toBe(filmResult2.alternativeTitles);
      expect(filmResult1.country).not.toEqual(filmResult2.country);
      expect(filmResult1.content).not.toEqual(filmResult2.content);
    });

    it('Admin should not update, unauthorized', async () => {
      const result = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send(TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA)
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

    it('Admin should not update cartoon, cartoon not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      await request(app.getHttpServer())
        .delete(`${adminCinemaCartoonsUrl}/1`)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const notFoundResult = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send(TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA)
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

    it('Admin should not update, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createProductionMovie(1, 'Film');

      const result = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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

      const badResult1 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, name: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
        ],
      });

      const badResult2 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA,
          name: 'rfjkrfnjkfrnjkfrnjknrfjknrfjkjkrfnjkfrnjkfrjknrfjknjkrfnjkrfnjkrfnjkrfnjkrfnjknrfjknrfjknrfjknjkfrnrfjkrfnjkrfnjkrnfkjjknfr',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
        ],
      });

      const badResult3 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, kpId: '       ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'kpId',
            errorKey: EXCEPTION_KEYS_ENUM.kpId,
          },
        ],
      });

      const badResult4 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA,
          kpId: 'rfjknfjkrnjkfrnjkfrnjkfrnjkrfnjknfrjknjkrfnjkrfjkfrnjkrfnjkrfnjkfrnjkrfnjfjrknjkfrnjfrnjfrjnrfjknrfjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult4.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'kpId',
            errorKey: EXCEPTION_KEYS_ENUM.kpId,
          },
        ],
      });

      const badResult5 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, description: '       ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult5.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'description',
            errorKey: EXCEPTION_KEYS_ENUM.description,
          },
        ],
      });

      const badResult6 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA,
          description:
            'rfkrfjkfrnjkfrnkjnjrfjkrfnjkfrnjkfjrknjkfrnjkfrnjkfrnjknfjrjkfrnjrfnjrfjkjfkrnjkfrnjkfrnjknfrjknfrjknjkfrnjkfrnjkfrjknfjrknjkfrnjkfrnjfrnjknrfjknjfkrnjfrnjfrnjkrfnjknfrjknjkrfnjkfrnjkrfnjkrfnjknrfjknjfkrnjkrfnjkfrnjkrfnjknjkrfnjfrnjkfrjknfrjknjfkrnjkfrnjkfrnjknfrjk',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult6.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'description',
            errorKey: EXCEPTION_KEYS_ENUM.description,
          },
        ],
      });

      const badResult7 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/filmId`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, releaseDate: '       ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult7.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'releaseDate',
            errorKey: EXCEPTION_KEYS_ENUM.releaseDate,
          },
        ],
      });

      const badResult8 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, releaseDate: '01012020' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult8.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'releaseDate',
            errorKey: EXCEPTION_KEYS_ENUM.releaseDate,
          },
        ],
      });

      const badResult9 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, originalName: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult9.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'originalName',
            errorKey: EXCEPTION_KEYS_ENUM.originalName,
          },
        ],
      });

      const badResult10 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA,
          originalName:
            'nrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfd',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult10.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'originalName',
            errorKey: EXCEPTION_KEYS_ENUM.originalName,
          },
        ],
      });

      const badResult11 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, alternativeName: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult11.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'alternativeName',
            errorKey: EXCEPTION_KEYS_ENUM.alternativeName,
          },
        ],
      });

      const badResult12 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({
          ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA,
          alternativeName:
            'nrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfdnrjnfrjrbfbjhfrhjrfhjbrfhjbhjrfbhjfrbhjdbrfhbrfdjhfrbhrfjbhrfhjfrdbfrhjrfdhbhjdrfbhrfdbrfdhjbrfhjdbhjrfdhjfrdbhjrfdbhjbfrhjbhjfrdbhjrdfbhjfrdbhjfrbhjbfhrjbjhrfdbhjbrfdhjbhfjrdbhfrdjbrfdjhrfdbhjrfd',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult12.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'alternativeName',
            errorKey: EXCEPTION_KEYS_ENUM.alternativeName,
          },
        ],
      });

      const badResult13 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, duration: 'duration' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult13.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'duration',
            errorKey: EXCEPTION_KEYS_ENUM.duration,
          },
        ],
      });

      const badResult14 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, duration: ['duration'] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult14.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'duration',
            errorKey: EXCEPTION_KEYS_ENUM.duration,
          },
        ],
      });

      const badResult15 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, videUrl: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult15.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'videUrl',
            errorKey: EXCEPTION_KEYS_ENUM.videUrl,
          },
        ],
      });

      const badResult16 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, videUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult16.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'videUrl',
            errorKey: EXCEPTION_KEYS_ENUM.videUrl,
          },
        ],
      });

      const badResult17 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, trailerUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult17.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'trailerUrl',
            errorKey: EXCEPTION_KEYS_ENUM.trailerUrl,
          },
        ],
      });

      const badResult19 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, trailerUrl: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult19.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'trailerUrl',
            errorKey: EXCEPTION_KEYS_ENUM.trailerUrl,
          },
        ],
      });

      const badResult20 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, backgroundContentUrl: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult20.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'backgroundContentUrl',
            errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
          },
        ],
      });

      const badResult21 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, backgroundContentUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult21.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'backgroundContentUrl',
            errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
          },
        ],
      });

      const badResult22 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, previewUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult22.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'previewUrl',
            errorKey: EXCEPTION_KEYS_ENUM.previewUrl,
          },
        ],
      });

      const badResult23 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, previewUrl: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult23.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'previewUrl',
            errorKey: EXCEPTION_KEYS_ENUM.previewUrl,
          },
        ],
      });

      const badResult24 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, titleUrl: '   ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult24.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'titleUrl',
            errorKey: EXCEPTION_KEYS_ENUM.titleUrl,
          },
        ],
      });

      const badResult25 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, titleUrl: 'url' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult25.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'titleUrl',
            errorKey: EXCEPTION_KEYS_ENUM.titleUrl,
          },
        ],
      });

      const badResult26 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/filmId`)
        .send(TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult26.body).toEqual({
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

      const badResult27 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, country: [{ country: 'Name' }] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult27.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'country',
            errorKey: EXCEPTION_KEYS_ENUM.country,
          },
        ],
      });

      const badResult28 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, country: ['     ', '      '] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult28.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'country',
            errorKey: EXCEPTION_KEYS_ENUM.country,
          },
        ],
      });

      const badResult29 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, genres: ['     '] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult29.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'genres',
            errorKey: EXCEPTION_KEYS_ENUM.genres,
          },
        ],
      });

      const badResult30 = await request(app.getHttpServer())
        .put(`${adminCinemaCartoonsUrl}/1`)
        .send({ ...TEST_ADMIN_CINEMA_CARTOON_UPDATE_DATA, genres: [{ genre: 'Name' }] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(badResult30.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'genres',
            errorKey: EXCEPTION_KEYS_ENUM.genres,
          },
        ],
      });

      const result2 = await request(app.getHttpServer())
        .get(`${adminCinemaCartoonsUrl}`)
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
  });
});
