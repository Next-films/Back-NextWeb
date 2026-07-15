import * as request from 'supertest';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MovieTypesEnum, TorApiMovieById, TorApiProvidersEnum } from '@/common/types/types';
import { TEST_MODERATION_APPLY_TASK } from '../../../../data/moderation-tasks.test.data';
import { ModerationTasksApplySuiteContext } from '../apply-moderation-tasks.suite';

export function registerModerationTasksApplyTorrentValidationSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getFinishedTorrentModerationRepository,
  createMovieAndTasks,
}: ModerationTasksApplySuiteContext): void {
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
}
