import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_MODERATION_MOVIE_ROUTE,
} from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum } from '@/common/types/types';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { adminLogin } from '../../../utils/auth/admin-login';
import { registerNewAdmin } from '../../../utils/auth/register-new-admin';

export type ModerationTasksCancelSuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminModerationTaskUrl: () => string;
  getBaseUri: () => string;
  getFinishedTorrentModerationRepository: () => FinishedTorrentModerationRepository;
  createMovieAndTasks: (...args: any[]) => Promise<void>;
};

export function registerModerationTasksCancelSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getBaseUri,
  getFinishedTorrentModerationRepository,
  createMovieAndTasks,
}: ModerationTasksCancelSuiteContext): void {
  describe('Admin moderation tasks => Cancel task', () => {
    it('Admin should cancel task by id', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);

      const result = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
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

      await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultAfterAccept = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
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

      await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedTorrent = await getFinishedTorrentModerationRepository().getByKpId(
        `${MovieTypesEnum.FILM}-1`,
      );

      expect(finishedTorrent).toBeDefined();

      // Check cartoon

      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const resultCartoon = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
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

      await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      const resultCartoonAfterAccept = await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
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

      await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
        .send({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedCartoonTorrent = await getFinishedTorrentModerationRepository().getByKpId(
        `${MovieTypesEnum.CARTOON}-1`,
      );

      expect(finishedCartoonTorrent).toBeDefined();
    });

    it('Admin should not cancel task by id, unauthorized', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [finishedFilmTorrent2, finishedCartoonTorrent2] = await Promise.all([
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent2).toBeDefined();
      expect(finishedCartoonTorrent2).toBeDefined();
    });

    it('Admin should not cancel task by id, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        await request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const result = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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

      const result2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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

      const result3 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/taskId/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
    });

    it('Admin should not cancel task by id, task not found', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
    });

    it('Admin should not cancel task by id, task not belong current admin', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await registerNewAdmin(
        getApp(),
        `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`,
        TEST_ADMIN_REG_DATA,
        accessToken,
      );
      const { accessToken: secondAccessToken } = await adminLogin(
        getApp(),
        `${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`,
        TEST_ADMIN_LOGIN_DATA,
      );

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${secondAccessToken}` })
          .expect(403),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
          .send({ type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [finishedFilmTorrent2, finishedCartoonTorrent2] = await Promise.all([
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent2).toBeDefined();
      expect(finishedCartoonTorrent2).toBeDefined();
    });
  });
}
