import * as request from 'supertest';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { MovieTypesEnum, TorApiMovieById, TorApiProvidersEnum } from '@/common/types/types';
import { MovieHandleStatus } from '@/movies/domain/types';
import { ModerationTasksApplySuiteContext } from '../apply-moderation-tasks.suite';

export function registerModerationTasksApplyTorrentSuite({
  getApp,
  getLoginByMainAdmin,
  getAdminModerationTaskUrl,
  getFinishedTorrentModerationRepository,
  getFilmRepository,
  getCartoonRepository,
  getDownloaderServiceAdapter,
  createMovieAndTasks,
}: ModerationTasksApplySuiteContext): void {
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
}
