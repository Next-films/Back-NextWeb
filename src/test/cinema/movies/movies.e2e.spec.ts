import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { initTestSettings } from '../../test-init-settings';
import { MOVIES_ROUTE } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { TEST_GET_ALL_GENRES_QUERY_DATA } from '../../data/movies.test.data';
import { GenerateGenreMigration } from '@/data-migrations/generate-genre.migration';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

describe('Movies public', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    baseUri = appUri + MOVIES_ROUTE.MAIN;
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateGenreMigration>(GenerateGenreMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Movies public => Genres', () => {
    it('User should get all genres', async () => {
      const result = await request(app.getHttpServer())
        .get(`${baseUri}/${MOVIES_ROUTE.GENRE}`)
        .query(TEST_GET_ALL_GENRES_QUERY_DATA)
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
      });
    });

    it('User should get all genres with pagination and search', async () => {
      const result1 = await request(app.getHttpServer())
        .get(`${baseUri}/${MOVIES_ROUTE.GENRE}`)
        .query({ page: 1, size: 10, searchName: 'Боевик' })
        .expect(200);

      expect(result1.body).toEqual({
        totalCount: 1,
        pagesCount: 1,
        page: 1,
        size: 10,
        items: expect.any(Array),
      });
      expect(result1.body.items).toHaveLength(1);
      expect(result1.body.items[0]).toEqual({
        id: expect.any(Number),
        name: 'боевик',
      });

      const result2 = await request(app.getHttpServer())
        .get(`${baseUri}/${MOVIES_ROUTE.GENRE}`)
        .query({ page: 10, size: 2 })
        .expect(200);

      expect(result2.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: 10,
        size: 2,
        items: expect.any(Array),
      });
      expect(result2.body.items).toHaveLength(2);
    });

    it('User should not get all genres, bad gage', async () => {
      const result = await request(app.getHttpServer())
        .get(`${baseUri}/${MOVIES_ROUTE.GENRE}`)
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
        .get(`${baseUri}/${MOVIES_ROUTE.GENRE}`)
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
});
