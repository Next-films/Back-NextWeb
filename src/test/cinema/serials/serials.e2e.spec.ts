import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { initTestSettings } from '../../test-init-settings';
import { SERIALS_ROUTE } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { GenerateGenreMigration } from '@/data-migrations/generate-genre.migration';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { execSync } from 'child_process';
import { TEST_GET_ALL_CARTOONS_QUERY_DATA } from '../../data/cartoons.test.data';
import { TEST_GET_ALL_SERIALS_QUERY_DATA } from '../../data/serials.test.data';
import {
  SerialsOutputDto,
  SpecifySerialsOutputDto,
} from '@/serials/api/dtos/output/serials.output.dto';

describe('Serials public', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    baseUri = appUri + SERIALS_ROUTE.MAIN;
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateGenreMigration>(GenerateGenreMigration);
    await migrationService.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Serials public => Get all serials', () => {
    it('User should get all serials (check view model, without correct data)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_SERIALS_QUERY_DATA)
        .expect(200);

      expect(result.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: 1,
        size: 50,
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
        country: expect.any(Array),
        episodeCount: expect.any(Number),
      });
      expect(result.body.items[0].genres[0]).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
      });
      result.body.items[0].country.forEach(i => {
        expect(typeof i).toBe('string');
      });
    });

    it('User should get all serials with pagination and search (check view model, without correct data)', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query({ ...TEST_GET_ALL_SERIALS_QUERY_DATA, size: 10, searchName: 'Игра в' })
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

    it('User should not get all serials, bad gage', async () => {
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

  describe('Serials public => Get serial by id', () => {
    it('User should get serial by id', async () => {
      execSync('yarn migrate-movies', { stdio: 'inherit' });

      const result = await request(app.getHttpServer())
        .get(`${baseUri}`)
        .query(TEST_GET_ALL_SERIALS_QUERY_DATA)
        .expect(200);

      expect(result.body).toEqual({
        totalCount: expect.any(Number),
        pagesCount: expect.any(Number),
        page: 1,
        size: 50,
        items: expect.any(Array),
      });

      const serial: SerialsOutputDto = result.body.items[2];

      const resultById = await request(app.getHttpServer())
        .get(`${baseUri}/${serial.id}`)
        .expect(200);

      expect(resultById.body.id).toBe(serial.id);
      expect(resultById.body.title).toBe(serial.title);
      expect(resultById.body.trailerUrl).toBe(serial.trailerUrl);
      expect(resultById.body.backgroundImg).toBe(serial.backgroundImg);
      expect(resultById.body.episodeCount).toBe(serial.episodeCount);
    });

    it('User should not get serial by id, serial not found', async () => {
      const result = await request(app.getHttpServer()).get(`${baseUri}/1`).expect(404);

      expect(result.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'serialId',
            errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
          },
        ],
      });
    });
  });

  describe('Serials public => Get serial episode by id', () => {
    it('User should get serial episode by id', async () => {
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

      const serial: SerialsOutputDto = result.body.items[2];

      const resultById = await request(app.getHttpServer())
        .get(`${baseUri}/${serial.id}`)
        .expect(200);

      const serialById: SpecifySerialsOutputDto = resultById.body;

      expect(serialById.id).toBe(serial.id);
      expect(serialById.title).toBe(serial.title);
      expect(serialById.trailerUrl).toBe(serial.trailerUrl);
      expect(serialById.backgroundImg).toBe(serial.backgroundImg);

      const episode = serialById.episodes[0];
      const resultEpisodes = await request(app.getHttpServer())
        .get(`${baseUri}/${serial.id}/${episode.id}`)
        .expect(200);

      expect(resultEpisodes.body).toEqual({
        id: episode.id,
        title: episode.title,
        description: expect.any(String),
        previewUrl: episode.previewUrl,
        releaseDate: expect.any(String),
        duration: expect.any(Number),
      });
    });

    it('User should not get serial episode by id, serial and episode not found', async () => {
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

      const serial: SerialsOutputDto = result.body.items[2];

      const resultById = await request(app.getHttpServer())
        .get(`${baseUri}/${serial.id}`)
        .expect(200);

      const serialById: SpecifySerialsOutputDto = resultById.body;

      expect(serialById.id).toBe(serial.id);
      expect(serialById.title).toBe(serial.title);
      expect(serialById.trailerUrl).toBe(serial.trailerUrl);
      expect(serialById.backgroundImg).toBe(serial.backgroundImg);

      const episode = serialById.episodes[0];
      const resultEpisodes = await request(app.getHttpServer())
        .get(`${baseUri}/${serial.id}/${episode.id}`)
        .expect(200);

      expect(resultEpisodes.body).toEqual({
        id: episode.id,
        title: episode.title,
        description: expect.any(String),
        previewUrl: episode.previewUrl,
        releaseDate: expect.any(String),
        duration: expect.any(Number),
      });

      const resultNotFound1 = await request(app.getHttpServer())
        .get(`${baseUri}/${serial.id}/999`)
        .expect(404);

      expect(resultNotFound1.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'episodeId',
            errorKey: EXCEPTION_KEYS_ENUM.EPISODE_NOT_FOUND,
          },
        ],
      });

      const resultNotFound2 = await request(app.getHttpServer())
        .get(`${baseUri}/999/${episode.id}`)
        .expect(404);

      expect(resultNotFound2.body).toEqual({
        message: expect.any(String),
        statusCode: 404,
        errorField: [
          {
            message: expect.any(String),
            field: 'episodeId',
            errorKey: EXCEPTION_KEYS_ENUM.EPISODE_NOT_FOUND,
          },
        ],
      });
    });
  });
});
