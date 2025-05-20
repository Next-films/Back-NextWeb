import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { initTestSettings } from '../../test-init-settings';
import { CARTOONS_ROUTE } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { GenerateGenreMigration } from '@/data-migrations/generate-genre.migration';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { execSync } from 'child_process';
import { FilmsOutputDto } from '@/films/api/dtos/output/films.output.dto';
import { TEST_GET_ALL_CARTOONS_QUERY_DATA } from '../../data/cartoons.test.data';

describe('Cartoons public', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    baseUri = appUri + CARTOONS_ROUTE.MAIN;
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateGenreMigration>(GenerateGenreMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Cartoons public => Get all cartoons', () => {
    it('User should get all cartoon (check view model, without correct data)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_CARTOONS_QUERY_DATA)
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
        title: expect.any(String),
        trailerUrl: expect.any(String),
        backgroundImg: expect.any(String),
        cardImg: expect.any(String),
        description: expect.any(String),
        subTitle: expect.any(String),
        titleImg: expect.any(String),
        releaseDate: expect.any(String),
        genres: expect.any(Array),
        duration: expect.any(Number),
        country: expect.any(Array),
      });
      expect(result.body.items[0].genres[0]).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
      });
      result.body.items[0].country.forEach(i => {
        expect(typeof i).toBe('string');
      });
    });

    it('User should get all cartoon with pagination and search (check view model, without correct data)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ ...TEST_GET_ALL_CARTOONS_QUERY_DATA, size: 10, searchName: 'Соник' })
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

    it('User should not get all cartoon, bad gage', async () => {
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

  describe('Cartoons public => Get cartoon by id', () => {
    it('User should get cartoon by id', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_CARTOONS_QUERY_DATA)
        .expect(200);

      expect(result.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: expect.any(Number),
        size: expect.any(Number),
        items: expect.any(Array),
      });

      const cartoon: FilmsOutputDto = result.body.items[5];

      const resultById = await request(app.getHttpServer())
        .get(`${baseUri}/${cartoon.id}`)
        .expect(200);

      expect(resultById.body.id).toBe(cartoon.id);
      expect(resultById.body.title).toBe(cartoon.title);
      expect(resultById.body.trailerUrl).toBe(cartoon.trailerUrl);
      expect(resultById.body.backgroundImg).toBe(cartoon.backgroundImg);
    });

    it('User should not get cartoon by id, cartoon not found', async () => {
      const result = await request(app.getHttpServer()).get(`${baseUri}/1`).expect(404);

      expect(result.body).toEqual({
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
  });
});
