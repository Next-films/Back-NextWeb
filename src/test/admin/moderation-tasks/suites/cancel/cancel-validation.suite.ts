import * as request from 'supertest';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationTasksCancelSuiteContext } from '../cancel-moderation-tasks.suite';

export function registerModerationTasksCancelValidationSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getFinishedTorrentModerationRepository,
  createMovieAndTasks,
}: ModerationTasksCancelSuiteContext): void {
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
}
