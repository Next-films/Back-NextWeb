import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_MODERATION_MOVIE_ROUTE,
} from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum, TorApiMovieById, TorApiProvidersEnum } from '@/common/types/types';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { MovieHandleStatus } from '@/movies/domain/types';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { TEST_MODERATION_APPLY_TASK } from '../../../data/moderation-tasks.test.data';
import { adminLogin } from '../../../utils/auth/admin-login';
import { registerNewAdmin } from '../../../utils/auth/register-new-admin';

export type ModerationTasksApplySuiteContext = {
  getApp: () => INestApplication;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminModerationTaskUrl: () => string;
  getBaseUri: () => string;
  getFinishedTorrentModerationRepository: () => FinishedTorrentModerationRepository;
  getFilmRepository: () => FilmRepository;
  getCartoonRepository: () => CartoonRepository;
  getDownloaderServiceAdapter: () => DownloaderServiceAdapter;
  createMovieAndTasks: (...args: any[]) => Promise<void>;
};

export function registerModerationTasksApplySuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getBaseUri,
  getFinishedTorrentModerationRepository,
  getFilmRepository,
  getCartoonRepository,
  getDownloaderServiceAdapter,
  createMovieAndTasks,
}: ModerationTasksApplySuiteContext): void {
  describe('Admin moderation tasks => Apply task', () => {
    it('Admin should apply task by id', async () => {
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
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send(TEST_MODERATION_APPLY_TASK)
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const [finishedTorrent, secondFinishedTorrentWithOldKpId] = await Promise.all([
        getFinishedTorrentModerationRepository().getByKpId(TEST_MODERATION_APPLY_TASK.kpId),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
      ]);

      expect(finishedTorrent).toBeDefined();
      expect(secondFinishedTorrentWithOldKpId).toBeNull();

      const film = await getFilmRepository().getFilmById(1);

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
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
        .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON, kpId: '333' })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(204);

      await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const [finishedCartoonTorrent, secondCartoonFinishedTorrentWithOldKpId] = await Promise.all([
        getFinishedTorrentModerationRepository().getByKpId(TEST_MODERATION_APPLY_TASK.kpId),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
      ]);

      expect(finishedCartoonTorrent).toBeDefined();
      expect(secondCartoonFinishedTorrentWithOldKpId).toBeNull();

      const cartoon = await getCartoonRepository().getCartoonById(1);

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
      const { accessToken } = await getLoginByMainAdmin()();

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

      const downloaderServiceAdapterSpy1 = jest.spyOn(
        getDownloaderServiceAdapter(),
        'addMovieToQueue',
      );

      try {
        await request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
        .query({ type: MovieTypesEnum.FILM })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedTorrent = await getFinishedTorrentModerationRepository().getByKpId(
        `${MovieTypesEnum.FILM}-1`,
      );

      expect(finishedTorrent).toBeDefined();

      const film = await getFilmRepository().getFilmById(1);

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

      const downloaderServiceAdapterSpy2 = jest.spyOn(
        getDownloaderServiceAdapter(),
        'addMovieToQueue',
      );

      try {
        await request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      await request(getApp().getHttpServer())
        .get(`${getAdminModerationTaskUrl()}/1`)
        .query({ type: MovieTypesEnum.CARTOON })
        .set({ authorization: `Bearer ${accessToken}` })
        .expect(404);

      const finishedCartoonTorrent = await getFinishedTorrentModerationRepository().getByKpId(
        `${MovieTypesEnum.CARTOON}-1`,
      );

      expect(finishedCartoonTorrent).toBeDefined();

      const cartoon = await getCartoonRepository().getCartoonById(1);

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
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer accessToken` })
          .expect(401),
        await request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);
    });

    it('Admin should not apply task by id, task not found', async () => {
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
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.CARTOON })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeDefined();
      expect(finishedCartoonTorrent).toBeDefined();
    });

    it('Admin should not apply task by id, task not accepted', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await createMovieAndTasks(1, MovieTypesEnum.FILM);
      await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

      const [resultFilm, resultCartoon] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
    });

    it('Admin should not apply task by id, task not belong current admin', async () => {
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
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${secondAccessToken}` })
          .expect(403),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
        getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
      ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, type: MovieTypesEnum.FILM })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(204),
      ]);
    });

    it('Admin should not apply task by id with torrent data, torrent data not valid', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

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

      const [resultFilm1, resultCartoon1] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send(TEST_MODERATION_APPLY_TASK)
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({ ...TEST_MODERATION_APPLY_TASK, provider: TorApiProvidersEnum.NONAMECLUB })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.NONAMECLUB,
            providerId: '333',
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
          .send({
            ...TEST_MODERATION_APPLY_TASK,
            provider: TorApiProvidersEnum.KINOZAL,
            providerId: '333',
          })
          .set({ authorization: `Bearer ${accessToken}` })
          .expect(404),
        request(getApp().getHttpServer())
          .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
          getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.FILM}-1`),
          getFinishedTorrentModerationRepository().getByKpId(`${MovieTypesEnum.CARTOON}-1`),
          getFinishedTorrentModerationRepository().getByKpId(torrentData.Kinopoisk_id!),
        ]);

      expect(finishedFilmTorrent).toBeNull();
      expect(finishedCartoonTorrent).toBeNull();
      expect(finishedTorrentByApplyTorrentKpId).toBeNull();
    });

    it('Admin should not apply task by id, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultProvider = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultProvider2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultProviderId = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultProviderId2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultDescription1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultDescription2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultDescription3 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultReleaseDate1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultReleaseDate2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultOriginalName1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultOriginalName2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultAlternativeName1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultAlternativeName2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultCountry1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultCountry2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultCountry3 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultTrailerUrl1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultTrailerUrl2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultPreviewUrl1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultPreviewUrl2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultGenres1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultGenres2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultGenres3 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultDuration1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultDuration2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultVideUrl1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultVideUrl2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultBackgroundContentUrl1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultBackgroundContentUrl2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultTitleUrl1 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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

      const resultTitleUrl2 = await request(getApp().getHttpServer())
        .post(`${getAdminModerationTaskUrl()}/1/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
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
}
