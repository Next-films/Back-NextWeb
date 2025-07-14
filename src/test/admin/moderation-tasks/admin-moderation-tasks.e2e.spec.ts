import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_MODERATION_MOVIE_ROUTE,
} from '@/common/constants/route.constants';
import { adminLogin } from '../../utils/auth/admin-login';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import * as request from 'supertest';
import {
  FindTorApiTorrentFilmType,
  MovieTypesEnum,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { Admin } from '@/admin/domain/admin.entity';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import {
  TEST_MODERATION_APPLY_TASK,
  TEST_MODERATION_GET_ALL_DATA,
} from '../../data/moderation-tasks.test.data';
import { MovieCreateDto, MovieHandleStatus } from '@/movies/domain/types';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { Film } from '@/films/domain/film.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { ModerationMovieTypeStatusEnum } from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { registerNewAdmin } from '../../utils/auth/register-new-admin';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../data/admin-auth.test.data';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

describe('Admin moderation tasks', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  let adminModerationTaskUrl: string;
  let moderationFilmRepository: ModerationFilmRepository;
  let moderationCartoonRepository: ModerationCartoonRepository;
  let filmRepository: FilmRepository;
  let cartoonRepository: CartoonRepository;
  let finishedTorrentModerationRepository: FinishedTorrentModerationRepository;
  let downloaderServiceAdapter: DownloaderServiceAdapter;

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

    adminModerationTaskUrl = appUri + ADMIN_MODERATION_MOVIE_ROUTE.MAIN;

    moderationFilmRepository = app.get(ModerationFilmRepository);
    moderationCartoonRepository = app.get(ModerationCartoonRepository);
    filmRepository = app.get(FilmRepository);
    cartoonRepository = app.get(CartoonRepository);
    finishedTorrentModerationRepository = app.get(FinishedTorrentModerationRepository);
    downloaderServiceAdapter = app.get(DownloaderServiceAdapter);

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

  const createTask = async (
    type: MovieTypesEnum,
    movieId: number,
    torrentData?: FindTorApiTorrentFilmType,
    admin?: Admin,
  ): Promise<void> => {
    const data: CreateModerationDto = {
      movieId,
    };

    if (torrentData) {
      data.torrentMetaData = torrentData;
    }

    if (admin) {
      data.admin = admin;
    }

    switch (type) {
      case MovieTypesEnum.FILM: {
        const moderationFilmEntity = ModerationFilmEntity.create<ModerationFilmEntity>(data);
        await moderationFilmRepository.save(moderationFilmEntity);
        return;
      }
      case MovieTypesEnum.CARTOON: {
        const moderationCartoonEntity =
          ModerationCartoonEntity.create<ModerationCartoonEntity>(data);
        await moderationCartoonRepository.save(moderationCartoonEntity);
        return;
      }
    }
  };

  const createMovie = async (
    type: MovieTypesEnum,
    kpId: string,
    movieName: string,
    hidden: boolean,
  ): Promise<number | null> => {
    const movieData: MovieCreateDto = {
      kpId,
      key: 'key',
      name: movieName,
      hidden,
      titleUrl: null,
      previewUrl: null,
      trailerUrl: null,
      backgroundContentUrl: null,
      genres: null,
      releaseDate: null,
      description: null,
      country: null,
      duration: 0,
      alternativeName: null,
      originalName: null,
      handleStatus: MovieHandleStatus.PROCESSING,
    };

    switch (type) {
      case MovieTypesEnum.FILM: {
        const film = Film.create(movieData);
        const result = await filmRepository.save(film);
        return result.id;
      }

      case MovieTypesEnum.CARTOON: {
        const cartoon = Cartoon.create(movieData);
        const result = await cartoonRepository.save(cartoon);

        return result.id;
      }

      default: {
        return null;
      }
    }
  };

  const createMovieAndTasks = async (
    count: number,
    type: MovieTypesEnum,
    hidden = true,
    torrentData?: FindTorApiTorrentFilmType,
    admin?: Admin,
  ) => {
    for (let i = 0; i < count; i++) {
      const movie = await createMovie(type, `${type}-${i + 1}`, `Movie ${i}`, hidden);

      if (!movie) {
        console.warn('Movie not created into tests');
        continue;
      }

      await createTask(type, movie, torrentData, admin);
    }
  };
  describe('Admin moderation tasks => Get all', () => {
    it('Admin should get all moderation tasks, with correct data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(5, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultPageSize = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultPage = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultCartoonType = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSort = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSearchMovieName = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatusAccepted1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatusPending1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatusAll1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultStatusAccepted2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatusPending2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatusAll2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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
      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(5, MovieTypesEnum.FILM);

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const result2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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
      const { accessToken } = await loginByMainAdmin();

      const resultPage1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultPage2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSize1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSize2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultType1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultType2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSort1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSort2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSearchMovieName1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSearchMovieName2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSearchMovieName3 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatus1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultStatus2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSortField1 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

      const resultSortField2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}`)
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

  describe('Admin moderation tasks => Get task by id', () => {
    it('Admin should get moderation task by id', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      // Check cartoon

      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const resultCartoon = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoon.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultCartoonAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoonAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });
    });

    it('Admin should get moderation task by id with torrent info', async () => {
      const { accessToken } = await loginByMainAdmin();

      const torrentData: TorApiMovieById = {
        Url: 'http://torrent.com/download',
        Size: '10GB',
        Id: '111',
        Name: 'Torrent movie',
        Hash: 'Hash',
        Magnet: 'Magnet',
        Files: [{ Name: 'file', Size: '10GB' }],
        Torrent: 'http://torrent.com',
        Posters: ['string'],
        Poster: 'string',
        Kinopoisk_link: 'https://kinopoisk.com',
        Kinopoisk_id: '999',
      };

      await createMovieAndTasks(1, MovieTypesEnum.FILM, true, {
        Kinozal: [torrentData],
      });

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: [
          {
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: torrentData.Id,
            name: torrentData.Name,
            description: null,
            originalName: null,
            fileSize: torrentData.Size,
            kpId: torrentData.Kinopoisk_id,
            imdbId: null,
            kinopoiskUrl: torrentData.Kinopoisk_link,
            imdbUrl: null,
            torrentUrl: torrentData.Url,
          },
        ],
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: [
          {
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: torrentData.Id,
            name: torrentData.Name,
            description: null,
            originalName: null,
            fileSize: torrentData.Size,
            kpId: torrentData.Kinopoisk_id,
            imdbId: null,
            kinopoiskUrl: torrentData.Kinopoisk_link,
            imdbUrl: null,
            torrentUrl: torrentData.Url,
          },
        ],
      });
    });

    it('Admin should not get moderation task by id, unauthorized', async () => {
      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
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

    it('Admin should not get moderation task by id, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: 'type' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result.body).toEqual({
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

      const result2 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
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

      const result3 = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/taskId`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.taskId,
          },
        ],
      });
    });

    it('Admin should not get moderation task by id, task not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      expect(result.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });
    });
  });

  describe('Admin moderation tasks => Accept task', () => {
    it('Admin should accept task by id', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      // Check cartoon

      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const resultCartoon = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoon.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultCartoonAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoonAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });
    });

    it('Admin should not accept task by id, unauthorized', async () => {
      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
      ]);

      expect(resultFilm.body).toEqual({
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

      expect(resultCartoon.body).toEqual({
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

    it('Admin should not accept task by id, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: 'type' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result.body).toEqual({
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

      const result2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
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

      const result3 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/taskId/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.taskId,
          },
        ],
      });
    });

    it('Admin should not accept task by id, task not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });
      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });
    });

    it('Admin should not accept task by id, task already accepted', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_ALREADY_ACCEPTED,
          },
        ],
      });
      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_ALREADY_ACCEPTED,
          },
        ],
      });
    });
  });

  describe('Admin moderation tasks => Cancel task', () => {
    it('Admin should cancel task by id', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedTorrent = await finishedTorrentModerationRepository.getByKpId(
        `${MovieTypesEnum.FILM}-1`,
      );

      expect(finishedTorrent).toBeDefined();

      // Check cartoon

      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const resultCartoon = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoon.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultCartoonAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoonAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedCartoonTorrent = await finishedTorrentModerationRepository.getByKpId(
        `${MovieTypesEnum.CARTOON}-1`,
      );

      expect(finishedCartoonTorrent).toBeDefined();
    });

    it('Admin should not cancel task by id, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
      ]);

      expect(resultFilm.body).toEqual({
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

      expect(resultCartoon.body).toEqual({
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

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [finishedFilmTorrent2, finishedCartoonTorrent2] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent2).toBeDefined();
      expect(finishedCartoonTorrent2).toBeDefined();
    });

    it('Admin should not cancel task by id, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        await request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const result = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: 'type' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result.body).toEqual({
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

      const result2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result2.body).toEqual({
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

      const result3 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/taskId/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result3.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.taskId,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
    });

    it('Admin should not cancel task by id, task not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });
      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });
    });

    it('Admin should not cancel task by id, task not accepted', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_ACCEPTED,
          },
        ],
      });
      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_ACCEPTED,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
    });

    it('Admin should not cancel task by id, task not belong current admin', async () => {
      const { accessToken } = await loginByMainAdmin();

      await registerNewAdmin(
        app,
        `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`,
        TEST_ADMIN_REG_DATA,
        accessToken,
      );
      const { accessToken: secondAccessToken } = await adminLogin(
        app,
        `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`,
        TEST_ADMIN_LOGIN_DATA,
      );

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${secondAccessToken}` })
          .expect(403),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${secondAccessToken}` })
          .expect(403),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 403,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_BELONG_YOU,
          },
        ],
      });
      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 403,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_BELONG_YOU,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [finishedFilmTorrent2, finishedCartoonTorrent2] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent2).toBeDefined();
      expect(finishedCartoonTorrent2).toBeDefined();
    });
  });

  describe('Admin moderation tasks => Apply task', () => {
    it('Admin should apply task by id', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send(TEST_MODERATION_APPLY_TASK)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const [finishedTorrent, secondFinishedTorrentWithOldKpId] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(TEST_MODERATION_APPLY_TASK.kpId),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
      ]);

      expect(finishedTorrent).toBeDefined();
      expect(secondFinishedTorrentWithOldKpId).toBeNull();

      const film = await filmRepository.getFilmById(1);

      expect(film).toBeDefined();
      expect(film).toEqual({
        id: 1,
        kpId: TEST_MODERATION_APPLY_TASK.kpId,
        videoUrl: TEST_MODERATION_APPLY_TASK.videUrl,
        title: TEST_MODERATION_APPLY_TASK.name,
        originalTitle: TEST_MODERATION_APPLY_TASK.originalName,
        description: TEST_MODERATION_APPLY_TASK.description,
        isHidden: false,
        country: expect.any(Array),
        alternativeTitles: TEST_MODERATION_APPLY_TASK.alternativeName,
        releaseDate: expect.any(String),
        duration: TEST_MODERATION_APPLY_TASK.duration,
        trailerUrl: TEST_MODERATION_APPLY_TASK.trailerUrl,
        backgroundContentUrl: TEST_MODERATION_APPLY_TASK.backgroundContentUrl,
        previewUrl: TEST_MODERATION_APPLY_TASK.previewUrl,
        titleUrl: TEST_MODERATION_APPLY_TASK.titleUrl,
        handleStatus: MovieHandleStatus.PRODUCTION,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(film?.country).toHaveLength(1);

      // Check cartoon

      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const resultCartoon = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoon.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultCartoonAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoonAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: null,
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON, kpId: '333' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const [finishedCartoonTorrent, secondCartoonFinishedTorrentWithOldKpId] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(TEST_MODERATION_APPLY_TASK.kpId),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
      ]);

      expect(finishedCartoonTorrent).toBeDefined();
      expect(secondCartoonFinishedTorrentWithOldKpId).toBeNull();

      const cartoon = await cartoonRepository.getCartoonById(1);

      expect(cartoon).toBeDefined();
      expect(cartoon).toEqual({
        id: 1,
        kpId: '333',
        videoUrl: TEST_MODERATION_APPLY_TASK.videUrl,
        title: TEST_MODERATION_APPLY_TASK.name,
        originalTitle: TEST_MODERATION_APPLY_TASK.originalName,
        description: TEST_MODERATION_APPLY_TASK.description,
        isHidden: false,
        country: expect.any(Array),
        alternativeTitles: TEST_MODERATION_APPLY_TASK.alternativeName,
        releaseDate: expect.any(String),
        duration: TEST_MODERATION_APPLY_TASK.duration,
        trailerUrl: TEST_MODERATION_APPLY_TASK.trailerUrl,
        backgroundContentUrl: TEST_MODERATION_APPLY_TASK.backgroundContentUrl,
        previewUrl: TEST_MODERATION_APPLY_TASK.previewUrl,
        titleUrl: TEST_MODERATION_APPLY_TASK.titleUrl,
        handleStatus: MovieHandleStatus.PRODUCTION,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(cartoon?.country).toHaveLength(1);
    });

    it('Admin should apply task by id with torrent data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const torrentData: TorApiMovieById = {
        Url: 'http://torrent.com/download',
        Size: '10GB',
        Id: '111',
        Name: 'Torrent movie',
        Hash: 'Hash',
        Magnet: 'Magnet',
        Files: [{ Name: 'file', Size: '10GB' }],
        Torrent: 'http://torrent.com',
        Posters: ['string'],
        Poster: 'string',
        Kinopoisk_link: 'https://kinopoisk.com',
        Kinopoisk_id: '999',
      };

      await createMovieAndTasks(1, MovieTypesEnum.FILM, true, { Kinozal: [torrentData] });

      const result = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(result.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: [
          {
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: torrentData.Id,
            name: torrentData.Name,
            description: null,
            originalName: null,
            fileSize: torrentData.Size,
            kpId: torrentData.Kinopoisk_id,
            imdbId: null,
            kinopoiskUrl: torrentData.Kinopoisk_link,
            imdbUrl: null,
            torrentUrl: torrentData.Url,
          },
        ],
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.FILM}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: [
          {
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: torrentData.Id,
            name: torrentData.Name,
            description: null,
            originalName: null,
            fileSize: torrentData.Size,
            kpId: torrentData.Kinopoisk_id,
            imdbId: null,
            kinopoiskUrl: torrentData.Kinopoisk_link,
            imdbUrl: null,
            torrentUrl: torrentData.Url,
          },
        ],
      });

      const downloaderServiceAdapterSpy1 = jest.spyOn(downloaderServiceAdapter, 'addMovieToQueue');

      try {
        await request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            type: MovieTypesEnum.FILM,
            name: 'Movie Film',
            kpId: `${MovieTypesEnum.FILM}-1`,
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: torrentData.Id,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);

        expect(downloaderServiceAdapterSpy1).toHaveBeenCalled();
        expect(downloaderServiceAdapterSpy1.mock.calls[0][2]).toBe(MovieTypesEnum.FILM);
      } finally {
        downloaderServiceAdapterSpy1.mockRestore();
      }

      await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedTorrent = await finishedTorrentModerationRepository.getByKpId(
        `${MovieTypesEnum.FILM}-1`,
      );

      expect(finishedTorrent).toBeDefined();

      const film = await filmRepository.getFilmById(1);

      expect(film).toBeDefined();
      expect(film).toEqual({
        id: 1,
        kpId: `${MovieTypesEnum.FILM}-1`,
        videoUrl: null,
        title: 'Movie Film',
        originalTitle: null,
        description: null,
        isHidden: true,
        country: null,
        alternativeTitles: null,
        releaseDate: null,
        duration: 0,
        trailerUrl: null,
        backgroundContentUrl: null,
        previewUrl: null,
        titleUrl: null,
        handleStatus: MovieHandleStatus.PROCESSING,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Check cartoon

      const torrentDataCartoon: TorApiMovieById = {
        Url: 'http://torrent.com/download',
        Size: '10GB',
        Id: '456',
        Name: 'Torrent movie',
        Hash: 'Hash',
        Magnet: 'Magnet',
        Files: [{ Name: 'file', Size: '10GB' }],
        Torrent: 'http://torrent.com',
        Posters: ['string'],
        Poster: 'string',
        Kinopoisk_link: 'https://kinopoisk.com',
        Kinopoisk_id: '764',
      };

      await createMovieAndTasks(1, MovieTypesEnum.CARTOON, true, { RuTor: [torrentDataCartoon] });

      const resultCartoon = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoon.body).toEqual({
        id: 1,
        acceptedAt: null,
        createdAt: expect.any(String),
        admin: null,
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: [
          {
            provider: TorApiProvidersEnum.RUTOR,
            providerId: torrentDataCartoon.Id,
            name: torrentDataCartoon.Name,
            description: null,
            originalName: null,
            fileSize: torrentDataCartoon.Size,
            kpId: torrentDataCartoon.Kinopoisk_id,
            imdbId: null,
            kinopoiskUrl: torrentDataCartoon.Kinopoisk_link,
            imdbUrl: null,
            torrentUrl: torrentDataCartoon.Url,
          },
        ],
      });

      await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultCartoonAfterAccept = await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultCartoonAfterAccept.body).toEqual({
        id: 1,
        acceptedAt: expect.any(String),
        createdAt: expect.any(String),
        admin: {
          id: 1,
          tgId: expect.any(String),
          tgUsername: expect.any(String),
        },
        movie: {
          id: 1,
          name: 'Movie 0',
          kpId: `${MovieTypesEnum.CARTOON}-1`,
          description: null,
          alternativeTitles: null,
          originalTitle: null,
          content: {
            titleUrl: null,
            backgroundContentUrl: null,
            previewUrl: null,
            trailerUrl: null,
            videoUrl: 'key',
          },
          releaseDate: null,
          duration: 0,
          genres: null,
          country: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        torrent: [
          {
            provider: TorApiProvidersEnum.RUTOR,
            providerId: torrentDataCartoon.Id,
            name: torrentDataCartoon.Name,
            description: null,
            originalName: null,
            fileSize: torrentDataCartoon.Size,
            kpId: torrentDataCartoon.Kinopoisk_id,
            imdbId: null,
            kinopoiskUrl: torrentDataCartoon.Kinopoisk_link,
            imdbUrl: null,
            torrentUrl: torrentDataCartoon.Url,
          },
        ],
      });

      const downloaderServiceAdapterSpy2 = jest.spyOn(downloaderServiceAdapter, 'addMovieToQueue');

      try {
        await request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            type: MovieTypesEnum.CARTOON,
            name: 'Movie Cartoon',
            kpId: `${MovieTypesEnum.CARTOON}-1`,
            provider: TorApiProvidersEnum.RUTOR,
            providerId: torrentDataCartoon.Id,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204);
        expect(downloaderServiceAdapterSpy2).toHaveBeenCalled();
        expect(downloaderServiceAdapterSpy2.mock.calls[0][2]).toBe(MovieTypesEnum.CARTOON);
      } finally {
        downloaderServiceAdapterSpy2.mockRestore();
      }

      await request(app.getHttpServer())
        .get(`${adminModerationTaskUrl}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedCartoonTorrent = await finishedTorrentModerationRepository.getByKpId(
        `${MovieTypesEnum.CARTOON}-1`,
      );

      expect(finishedCartoonTorrent).toBeDefined();

      const cartoon = await cartoonRepository.getCartoonById(1);

      expect(cartoon).toBeDefined();
      expect(cartoon).toEqual({
        id: 1,
        kpId: `${MovieTypesEnum.CARTOON}-1`,
        videoUrl: null,
        title: 'Movie Cartoon',
        originalTitle: null,
        description: null,
        isHidden: true,
        country: null,
        alternativeTitles: null,
        releaseDate: null,
        duration: 0,
        trailerUrl: null,
        backgroundContentUrl: null,
        previewUrl: null,
        titleUrl: null,
        handleStatus: MovieHandleStatus.PROCESSING,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('Admin should not apply task by id, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
        await request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
      ]);

      expect(resultFilm.body).toEqual({
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

      expect(resultCartoon.body).toEqual({
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

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);
    });

    it('Admin should not apply task by id, task not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });

      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_FOUND,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeDefined();
      expect(finishedCartoonTorrent).toBeDefined();
    });

    it('Admin should not apply task by id, task not accepted', async () => {
      const { accessToken } = await loginByMainAdmin();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_ACCEPTED,
          },
        ],
      });

      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_ACCEPTED,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
    });

    it('Admin should not apply task by id, task not belong current admin', async () => {
      const { accessToken } = await loginByMainAdmin();

      await registerNewAdmin(
        app,
        `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`,
        TEST_ADMIN_REG_DATA,
        accessToken,
      );
      const { accessToken: secondAccessToken } = await adminLogin(
        app,
        `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`,
        TEST_ADMIN_LOGIN_DATA,
      );

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${secondAccessToken}` })
          .expect(403),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${secondAccessToken}` })
          .expect(403),
      ]);

      expect(resultFilm.body).toEqual({
        message: expect.any(String),
        statusCode: 403,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_BELONG_YOU,
          },
        ],
      });

      expect(resultCartoon.body).toEqual({
        message: expect.any(String),
        statusCode: 403,
        errorField: [
          {
            message: expect.any(String),
            field: 'taskId',
            errorKey: EXCEPTION_KEYS_ENUM.MODERATION_TASK_NOT_BELONG_YOU,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent] = await Promise.all([
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
        finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);
    });

    it('Admin should not apply task by id with torrent data, torrent data not valid', async () => {
      const { accessToken } = await loginByMainAdmin();

      const torrentData: TorApiMovieById = {
        Url: 'http://torrent.com/download',
        Size: '10GB',
        Id: '111',
        Name: 'Torrent movie',
        Hash: 'Hash',
        Magnet: 'Magnet',
        Files: [{ Name: 'file', Size: '10GB' }],
        Torrent: 'http://torrent.com',
        Posters: ['string'],
        Poster: 'string',
        Kinopoisk_link: 'https://kinopoisk.com',
        Kinopoisk_id: '999',
      };

      await createMovieAndTasks(1, MovieTypesEnum.FILM, true, { Kinozal: [torrentData] });
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON, true, { Kinozal: [torrentData] });

      await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm1, resultCartoon1] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
      ]);

      expect(resultFilm1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_PASSED,
          },
        ],
      });

      expect(resultCartoon1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_PASSED,
          },
        ],
      });

      const [resultFilm2, resultCartoon2] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, provider: TorApiProvidersEnum.NONAMECLUB })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.NONAMECLUB,
            type: MovieTypesEnum.CARTOON,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
      ]);

      expect(resultFilm2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_PASSED,
          },
        ],
      });

      expect(resultCartoon2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_PASSED,
          },
        ],
      });

      const [resultFilm3, resultCartoon3] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.NONAMECLUB,
            providerId: '333',
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.NONAMECLUB,
            providerId: '333',
            type: MovieTypesEnum.CARTOON,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
      ]);

      expect(resultFilm3.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_FOUND,
          },
        ],
      });

      expect(resultCartoon3.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'provider',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_NOT_FOUND,
          },
        ],
      });

      const [resultFilm4, resultCartoon4] = await Promise.all([
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: '333',
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(app.getHttpServer())
          .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: '333',
            type: MovieTypesEnum.CARTOON,
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
      ]);

      expect(resultFilm4.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_MOVIE_NOT_FOUND,
          },
        ],
      });

      expect(resultCartoon4.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'providerId',
            errorKey: EXCEPTION_KEYS_ENUM.PROVIDER_MOVIE_NOT_FOUND,
          },
        ],
      });

      const [finishedFilmTorrent, finishedCartoonTorrent, finishedTorrentByApplyTorrentKpId] =
        await Promise.all([
          finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.FILM}-1`),
          finishedTorrentModerationRepository.getByKpId(`${MovieTypesEnum.CARTOON}-1`),
          finishedTorrentModerationRepository.getByKpId(torrentData.Kinopoisk_id!),
        ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
      expect(finishedTorrentByApplyTorrentKpId).toBeNull();
    });

    it('Admin should not apply task by id, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({})
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(result.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'type',
            errorKey: EXCEPTION_KEYS_ENUM.type,
          },
          {
            message: expect.any(String),
            field: 'name',
            errorKey: EXCEPTION_KEYS_ENUM.name,
          },
          {
            message: expect.any(String),
            field: 'kpId',
            errorKey: EXCEPTION_KEYS_ENUM.kpId,
          },
        ],
      });

      const resultProvider = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, provider: 'provider' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultProvider.body).toEqual({
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

      const resultProvider2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, provider: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultProvider2.body).toEqual({
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

      const resultProviderId = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, providerId: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultProviderId.body).toEqual({
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

      const resultProviderId2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          providerId:
            'mkrnjkrfnjkw4njk4bhjb4rhjbr4hjbhfjwbhjffrfbhfjrbhjfhjfrbhjfrbhjbfrhjbhjfrrwbhjfrbhjfrwbhjbfrwhjbhjfrwbhjrwf',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultProviderId2.body).toEqual({
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

      const resultDescription1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, description: '     ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultDescription1.body).toEqual({
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

      const resultDescription2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, description: 'd' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultDescription2.body).toEqual({
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

      const resultDescription3 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          description:
            'djkrnjkrfenjknfrejknfjkerhjefrbhjkferkhjfervjfrevrefvgefrvghrfevfrgvfreghvghfrevghfrevghfrghfervgefrvghrvefghvfegrvgehrfvfgrehvghefrvghfrevghrefvghefrvghfervghfrvghfrevghefrvghfrevgherfvghrefvgvfreghvefrghvfreghvghfrevghfrevghfrevghfrevghfrevghfrevghvefrghvfreghvgfhrerefferjnferhfjerbhjferbhjrfebhjfrehjbfrhjbhjfrebhjefrbhjfrebhjfrebhjferbhjrefhjbfhjrbhjfrhjfrbhjfrebhjferbhjfbrhjbhfjerbhjfrebhjferbhjrfebhfrbehjbfrebjferbhfrehjfrbehjfrebhjbfrehbhjfrebhjfrebhjfrhjfrbehjbfrejh',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultDescription3.body).toEqual({
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

      const resultReleaseDate1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, releaseDate: 'd' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultReleaseDate1.body).toEqual({
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

      const resultReleaseDate2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, releaseDate: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultReleaseDate2.body).toEqual({
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

      const resultOriginalName1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, originalName: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultOriginalName1.body).toEqual({
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

      const resultOriginalName2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          originalName:
            'djrfjkhfrhfrsjhfrshbrfbhjfrbhjfhjrbfshrjbhjrfbhjrsfbhjbfrshjbhfrbhjrfsbhjbfsrhjhfjrshjfrsbhjfsrbhjsfrbhjbfrshjhjfrsbhjrsfhjbfrshjfrsbjh',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultOriginalName2.body).toEqual({
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

      const resultAlternativeName1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, alternativeName: '    ' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultAlternativeName1.body).toEqual({
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

      const resultAlternativeName2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          alternativeName:
            'djkrnjkrfenjknfrejknfjkerhjefrbhjkferkhjfervjfrevrefvgefrvghrfevfrgvfreghvghfrevghfrevghfrghfervgefrvghrvefghvfegrvgehrfvfgrehvghefrvghfrevghrefvghefrvghfervghfrvghfrevghefrvghfrevgherfvghrefvgvfreghvefrghvfreghvghfrevghfrevghfrevghfrevghfrevghfrevghvefrghvfreghvgfhrerefferjnferhfjerbhjferbhjrfebhjfrehjbfrhjbhjfrebhjefrbhjfrebhjfrebhjferbhjrefhjbfhjrbhjfrhjfrbhjfrebhjferbhjfbrhjbhfjerbhjfrebhjferbhjrfebhfrbehjbfrebjferbhfrehjfrbehjfrebhjbfrehbhjfrebhjfrebhjfrhjfrbehjbfrejh',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultAlternativeName2.body).toEqual({
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

      const resultCountry1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, country: ['    ', ['       ']] })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultCountry1.body).toEqual({
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

      const resultCountry2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          country: [
            'rnjkjkfrnjfrbhjfrbhjrfhjbfhjrbhjrfbhjfrbhjfrhjbfrhjbfrhjfrbrfhbrfhjbhjfrbhjfr',
          ],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultCountry2.body).toEqual({
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

      const resultCountry3 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          country: [{ name: 'Belarus' }],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultCountry3.body).toEqual({
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

      const resultTrailerUrl1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          trailerUrl: 'trailer',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultTrailerUrl1.body).toEqual({
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

      const resultTrailerUrl2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          trailerUrl: '     ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultTrailerUrl2.body).toEqual({
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

      const resultPreviewUrl1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          previewUrl: '     ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultPreviewUrl1.body).toEqual({
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

      const resultPreviewUrl2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          previewUrl: 'preview',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultPreviewUrl2.body).toEqual({
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

      const resultGenres1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          genres: ['     ', ''],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultGenres1.body).toEqual({
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

      const resultGenres2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          genres: [
            'njknjkvnjkvfnjkvfjknfvdjkvnfjkndfvjknjkfvdnjkfvnjkvfdnjkvfdjkrfhbhfrbhjrfbhjhjfrbhjfrbhjrfbhjbrfhjbhjrfhjfrbhjrfbhj',
            '',
          ],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultGenres2.body).toEqual({
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

      const resultGenres3 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          genres: [
            {
              name: 'genre',
            },
          ],
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultGenres3.body).toEqual({
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

      const resultDuration1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          duration: 100_000,
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultDuration1.body).toEqual({
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

      const resultDuration2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          duration: 'duration',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultDuration2.body).toEqual({
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

      const resultVideUrl1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          videUrl: '     ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultVideUrl1.body).toEqual({
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

      const resultVideUrl2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          videUrl: 'video',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultVideUrl2.body).toEqual({
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

      const resultBackgroundContentUrl1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          backgroundContentUrl: 'backgroundContentUrl',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultBackgroundContentUrl1.body).toEqual({
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

      const resultBackgroundContentUrl2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          backgroundContentUrl: '      ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultBackgroundContentUrl2.body).toEqual({
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

      const resultTitleUrl1 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          titleUrl: '      ',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultTitleUrl1.body).toEqual({
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

      const resultTitleUrl2 = await request(app.getHttpServer())
        .post(`${adminModerationTaskUrl}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({
          ...TEST_MODERATION_APPLY_TASK,
          titleUrl: 'title',
        })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(400);

      expect(resultTitleUrl2.body).toEqual({
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
    });
  });
});
