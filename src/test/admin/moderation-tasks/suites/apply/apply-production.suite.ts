import * as request from 'supertest';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { MovieTypesEnum } from '@/common/types/types';
import { MovieHandleStatus } from '@/movies/domain/types';
import { TEST_MODERATION_APPLY_TASK } from '../../../../data/moderation-tasks.test.data';
import { ModerationTasksApplySuiteContext } from '../apply-moderation-tasks.suite';

export function registerModerationTasksApplyProductionSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getFinishedTorrentModerationRepository,
  getFilmRepository,
  getCartoonRepository,
  createMovieAndTasks,
}: ModerationTasksApplySuiteContext): void {
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
}
