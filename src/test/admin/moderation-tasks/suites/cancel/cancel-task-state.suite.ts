import * as request from 'supertest';
import {
  ADMIN_AUTH_ROUTES,
  ADMIN_MODERATION_MOVIE_ROUTE,
} from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum } from '@/common/types/types';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../../data/admin-auth.test.data';
import { adminLogin } from '../../../../utils/auth/admin-login';
import { registerNewAdmin } from '../../../../utils/auth/register-new-admin';
import { ModerationTasksCancelSuiteContext } from '../cancel-moderation-tasks.suite';

export function registerModerationTasksCancelTaskStateSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getBaseUri,
  getFinishedTorrentModerationRepository,
  createMovieAndTasks,
}: ModerationTasksCancelSuiteContext): void {
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
}
