import * as request from 'supertest';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationTasksCancelSuiteContext } from '../cancel-moderation-tasks.suite';

export function registerModerationTasksCancelSuccessSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getFinishedTorrentModerationRepository,
  createMovieAndTasks,
}: ModerationTasksCancelSuiteContext): void {
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
}
