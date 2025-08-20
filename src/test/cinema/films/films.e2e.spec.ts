import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { initTestSettings } from '../../test-init-settings';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_CINEMA_ROUTE,
  FILMS_ROUTE,
} from '@/common/constants/route.constants';
import * as request from 'supertest';
import { GenerateGenreMigration } from '@/data-migrations/generate-genre.migration';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { TEST_GET_ALL_FILMS_QUERY_DATA } from '../../data/films.test.data';
import { execSync } from 'child_process';
import { FilmsPublicOutputDto } from '@/films/api/dtos/output/films-public.output.dto';
import {
  TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA,
  TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA,
} from '../../data/admin-cinema.test.data';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { adminLogin } from '../../utils/auth/admin-login';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { NewFilmIsHandleNotificationCommand } from '@/films/application/handlers/new-film-is-handle-notification.handler';
import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { CommandBus } from '@nestjs/cqrs';
import { NewFilmNotificationPayloadDto } from '@/films/api/dtos/input/new-film-notification.input.dto';
import { NewFilmNotificationCommand } from '@/films/application/handlers/new-film-notification.handler';

describe('Films public', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  let adminCinemaFilmsUrl: string;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let kinopoiskService: KinopoiskService;
  let commandBus: CommandBus;

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

    baseUri = appUri + FILMS_ROUTE.MAIN;
    adminCinemaFilmsUrl = appUri + `${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.FILMS}`;
    kinopoiskService = app.get(KinopoiskService);
    commandBus = app.get(CommandBus);

    loginByMainAdmin = () =>
      adminLogin(
        app,
        `${appUri}${ADMIN_AUTH_ROUTES.MAIN}/${ADMIN_AUTH_ROUTES.LOGIN}`,
        mainAdminLoginData,
      );
  });

  const createMovie = async (
    kpId: number,
    duration: number,
    resolvedValues: KinopoiskMovie,
  ): Promise<void> => {
    const kinopoiskSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskSpy.mockResolvedValue(resolvedValues);

    const payload: NewFilmNotificationPayloadDto = {
      key: `https://video.com/${kpId}`,
      kpId: String(kpId),
      duration,
    };

    const result = await commandBus.execute<
      NewFilmNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewFilmNotificationCommand(payload));

    kinopoiskSpy.mockRestore();

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
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
      NewFilmIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewFilmIsHandleNotificationCommand(payload));

    kinopoiskSpy.mockRestore();

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
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

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateGenreMigration>(GenerateGenreMigration);
    const migrationServiceAdmin = app.get<GenerateAdminMigration>(GenerateAdminMigration);

    await migrationService.onModuleInit();
    await migrationServiceAdmin.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Films public => Get all films', () => {
    it('User should get all films (check view model, without correct data)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_FILMS_QUERY_DATA)
        .expect(200);

      expect(result.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: expect.any(Number),
        size: expect.any(Number),
        items: expect.any(Array),
      });
      expect(result.body.items[0]).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
        previewUrl: expect.any(String),
        releaseDate: expect.any(String),
        genres: expect.any(Array),
      });
      expect(result.body.items[0].genres[0]).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
      });
    });

    it('User should get all films with pagination and search (check view model, without correct data)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ ...TEST_GET_ALL_FILMS_QUERY_DATA, size: 10, searchName: 'Граф' })
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });

      const result1 = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ page: 1, size: 1 })
        .expect(200);

      expect(result1.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: 1,
        size: 1,
        items: expect.any(Array),
      });
      expect(result1.body.items).toHaveLength(1);

      const result2 = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ page: 2, size: 2 })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: 2,
        size: 2,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(2);
    });

    it('User should not get hidden, moderation and processing films)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const { accessToken } = await loginByMainAdmin();

      await createModerationMovie(9901, 'movieName');
      await createProcessingMovies(['9999', '2222222'], ['movieName3', 'movieName4']);

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_FILMS_QUERY_DATA)
        .expect(200);

      expect(result.body).toEqual({
        totalCount: 98,
        pagesCount: 2,
        page: 1,
        size: 50,
        items: expect.any(Array),
      });
      expect(result.body.items).toHaveLength(50);

      await request(app.getHttpServer())
        .patch(`${adminCinemaFilmsUrl}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const result2 = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_FILMS_QUERY_DATA)
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: 97,
        pagesCount: 2,
        page: 1,
        size: 50,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(50);

      const resultFilmsByAdmin = await request(app.getHttpServer())
        .get(`${adminCinemaFilmsUrl}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultFilmsByAdmin.body).toEqual({
        totalCount: 101,
        pagesCount: 11,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultFilmsByAdmin.body.items).toHaveLength(10);
    });

    it('User should not get all films, bad gage', async () => {
      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ page: 100 })
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

      const result2 = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ page: 200000 })
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
    });
  });

  describe('Films public => Get film by id', () => {
    it('User should get film by id', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_FILMS_QUERY_DATA)
        .expect(200);

      expect(result.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: expect.any(Number),
        size: expect.any(Number),
        items: expect.any(Array),
      });

      const film: FilmsPublicOutputDto = result.body.items[5];

      const resultById = await request(app.getHttpServer())
        .get(`${baseUri}/${film.id}`)
        .query(TEST_GET_ALL_FILMS_QUERY_DATA)
        .expect(200);

      expect(resultById.body.id).toBe(film.id);
      expect(resultById.body.name).toBe(film.name);
    });

    it('User should not get film by id, film not found', async () => {
      const result = await request(app.getHttpServer()).get(`${baseUri}/1`).expect(404);

      expect(result.body).toEqual({
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

    it('User should not get hidden, moderation and processing film by id)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const { accessToken } = await loginByMainAdmin();

      await createModerationMovie(9901, 'movieName');
      await createProcessingMovies(['9999', '2222222'], ['movieName3', 'movieName4']);

      const lastValidFilmId = 98;

      await request(app.getHttpServer()).get(`${baseUri}/1`).expect(200);

      await request(app.getHttpServer())
        .patch(`${adminCinemaFilmsUrl}/1`)
        .send(TEST_ADMIN_CINEMA_FILMS_SHOW_OR_HIDE_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const [resultNotFound1, resultNotFound2, resultNotFound3] = await Promise.all([
        request(app.getHttpServer()).get(`${baseUri}/1`).expect(404),
        request(app.getHttpServer())
          .get(`${baseUri}/${lastValidFilmId + 1}`)
          .expect(404),
        request(app.getHttpServer())
          .get(`${baseUri}/${lastValidFilmId + 2}`)
          .expect(404),
      ]);

      expect(resultNotFound1.body).toEqual({
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

      expect(resultNotFound2.body).toEqual({
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

      expect(resultNotFound3.body).toEqual({
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

      const resultFilmsByAdmin = await request(app.getHttpServer())
        .get(`${adminCinemaFilmsUrl}`)
        .query(TEST_ADMIN_CINEMA_FILMS_GET_ALL_DATA)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(200);

      expect(resultFilmsByAdmin.body).toEqual({
        totalCount: 101,
        pagesCount: 11,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(resultFilmsByAdmin.body.items).toHaveLength(10);
    });
  });
});
