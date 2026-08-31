import { INestApplication } from '@nestjs/common';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { TestService } from 'test/test.service';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import {
  NewFilmNotificationCommand,
  NewFilmNotificationCommandHandler,
} from '@/films/application/handlers/new-film-notification.handler';
import {
  NewFilmIsHandleNotificationCommand,
  NewFilmIsHandleNotificationCommandHandler,
} from '@/films/application/handlers/new-film-is-handle-notification.handler';
import {
  ReplaceFilmSourceCommand,
  ReplaceFilmSourceCommandHandler,
} from '@/films/application/handlers/replace-film-source.handler';

describe('ReplaceFilmSourceCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: ReplaceFilmSourceCommandHandler;
  let newFilmHandler: NewFilmNotificationCommandHandler;
  let newFilmIsHandleHandler: NewFilmIsHandleNotificationCommandHandler;
  let filmRepository: FilmRepository;
  let kinopoiskService: KinopoiskService;
  let testService: TestService;

  const kpMovieFull = {
    name: 'Человек-паук',
    enName: 'Spider-Man',
    alternativeName: 'Spider-Man',
    year: 2026,
    countries: [{ name: 'США' }],
    description: 'Описание',
    genres: [{ name: 'Боевик' }],
    premiere: { world: '2026-01-01' },
    poster: { url: 'https://poster.com' },
    logo: { url: 'https://logo.com' },
    videos: { trailers: [{ site: 'youtube', url: 'https://youtube.com' }] },
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(ReplaceFilmSourceCommandHandler);
    newFilmHandler = app.get(NewFilmNotificationCommandHandler);
    newFilmIsHandleHandler = app.get(NewFilmIsHandleNotificationCommandHandler);
    filmRepository = app.get(FilmRepository);
    kinopoiskService = app.get(KinopoiskService);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  const publishFilm = async (kpId: string, key: string, duration: number) => {
    const spy = jest.spyOn(kinopoiskService, 'getMovieById');
    spy.mockResolvedValueOnce(kpMovieFull);
    await newFilmHandler.execute(new NewFilmNotificationCommand({ kpId, key, duration }));
    spy.mockRestore();
  };

  it('заменяет videoUrl и duration, возвращает прежнюю ссылку', async () => {
    await publishFilm('1', 'https://s3/films/aaa_1/master.m3u8', 6000);

    const result = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '1',
        key: 'https://s3/films/bbb_1/master.m3u8',
        duration: 7200,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
    expect(result.data).toEqual({ previousVideoUrl: 'https://s3/films/aaa_1/master.m3u8' });

    const film = await filmRepository.getFilmByKinopoiskId('1');
    expect(film?.videoUrl).toBe('https://s3/films/bbb_1/master.m3u8');
    expect(film?.duration).toBe(7200);
  });

  it('не трогает метаданные, постеры, статус и жанры', async () => {
    await publishFilm('1', 'https://s3/films/aaa_1/master.m3u8', 6000);
    const beforeShallow = await filmRepository.getFilmByKinopoiskId('1');
    const before = await filmRepository.getFilmById(beforeShallow!.id);

    await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '1',
        key: 'https://s3/films/bbb_1/master.m3u8',
        duration: 7200,
      }),
    );

    const after = await filmRepository.getFilmById(beforeShallow!.id);
    expect(after?.title).toBe(before?.title);
    expect(after?.description).toBe(before?.description);
    expect(after?.previewUrl).toBe(before?.previewUrl);
    expect(after?.titleUrl).toBe(before?.titleUrl);
    expect(after?.backgroundContentUrl).toBe(before?.backgroundContentUrl);
    expect(after?.releaseDate).toBe(before?.releaseDate);
    expect(after?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(after?.isHidden).toBe(before?.isHidden);
    expect(after?.genres?.map(genre => genre.name).sort()).toEqual(
      before?.genres?.map(genre => genre.name).sort(),
    );
  });

  it('возвращает NotFound, если фильма нет', async () => {
    const result = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '404',
        key: 'https://s3/films/bbb_404/master.m3u8',
        duration: 7200,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.NotFound);
    expect(result.errorField).toEqual({
      errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
      message: expect.any(String),
      field: 'kpId',
    });
  });

  it('отказывает, если фильм на модерации, и не меняет videoUrl', async () => {
    const spy = jest.spyOn(kinopoiskService, 'getMovieById');
    spy.mockResolvedValueOnce({ name: 'Фильм', enName: 'Film', year: 2026 });
    await newFilmHandler.execute(
      new NewFilmNotificationCommand({
        kpId: '2',
        key: 'https://s3/films/aaa_2/master.m3u8',
        duration: 100,
      }),
    );
    spy.mockRestore();

    const before = await filmRepository.getFilmByKinopoiskId('2');
    expect(before?.handleStatus).toBe(MovieHandleStatus.MODERATE);

    const result = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '2',
        key: 'https://s3/films/bbb_2/master.m3u8',
        duration: 200,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(result.errorField).toEqual({
      errorKey: EXCEPTION_KEYS_ENUM.FILM_ON_MODERATION,
      message: expect.any(String),
      field: 'kpId',
    });

    const after = await filmRepository.getFilmByKinopoiskId('2');
    expect(after?.videoUrl).toBe(before?.videoUrl);
  });

  it('отказывает, если фильм ещё не опубликован (PROCESSING), и не меняет videoUrl', async () => {
    const spy = jest.spyOn(kinopoiskService, 'getMovieById');
    spy.mockResolvedValueOnce({ name: 'Фильм 3', enName: 'Film 3', year: 2026 });
    await newFilmIsHandleHandler.execute(new NewFilmIsHandleNotificationCommand({ kpIds: ['3'] }));
    spy.mockRestore();

    const before = await filmRepository.getFilmByKinopoiskId('3');
    expect(before?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(before?.videoUrl).toBeNull();

    const result = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '3',
        key: 'https://s3/films/bbb_3/master.m3u8',
        duration: 300,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(result.errorField).toEqual({
      errorKey: EXCEPTION_KEYS_ENUM.FILM_SOURCE_NOT_REPLACEABLE,
      message: expect.any(String),
      field: 'kpId',
    });

    const after = await filmRepository.getFilmByKinopoiskId('3');
    expect(after?.videoUrl).toBe(before?.videoUrl);
  });

  it('откатывает транзакцию при ошибке сохранения, не меняя videoUrl и duration', async () => {
    await publishFilm('5', 'https://s3/films/aaa_5/master.m3u8', 6000);
    const before = await filmRepository.getFilmByKinopoiskId('5');

    const saveSpy = jest.spyOn(filmRepository, 'save').mockRejectedValueOnce(new Error('boom'));

    let result;
    try {
      result = await handler.execute(
        new ReplaceFilmSourceCommand({
          kpId: '5',
          key: 'https://s3/films/bbb_5/master.m3u8',
          duration: 9000,
        }),
      );
    } finally {
      saveSpy.mockRestore();
    }

    expect(result.appResult).toBe(AppNotificationResultEnum.InternalError);

    const after = await filmRepository.getFilmByKinopoiskId('5');
    expect(after?.videoUrl).toBe(before?.videoUrl);
    expect(after?.duration).toBe(before?.duration);
  });

  it('повторный вызов с тем же ключом идемпотентен: Success, previousVideoUrl = null', async () => {
    await publishFilm('7', 'https://s3/films/aaa_7/master.m3u8', 6000);

    const first = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '7',
        key: 'https://s3/films/bbb_7/master.m3u8',
        duration: 7200,
      }),
    );

    expect(first.appResult).toBe(AppNotificationResultEnum.Success);
    expect(first.data).toEqual({ previousVideoUrl: 'https://s3/films/aaa_7/master.m3u8' });

    const replay = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '7',
        key: 'https://s3/films/bbb_7/master.m3u8',
        duration: 7200,
      }),
    );

    expect(replay.appResult).toBe(AppNotificationResultEnum.Success);
    expect(replay.data).toEqual({ previousVideoUrl: null });

    const film = await filmRepository.getFilmByKinopoiskId('7');
    expect(film?.videoUrl).toBe('https://s3/films/bbb_7/master.m3u8');
    expect(film?.duration).toBe(7200);
  });

  it('отклоняет пустой key и не меняет videoUrl', async () => {
    await publishFilm('8', 'https://s3/films/aaa_8/master.m3u8', 6000);
    const before = await filmRepository.getFilmByKinopoiskId('8');

    const expectedError = {
      errorKey: EXCEPTION_KEYS_ENUM.FILM_SOURCE_NOT_REPLACEABLE,
      message: expect.any(String),
      field: 'key',
    };

    const emptyResult = await handler.execute(
      new ReplaceFilmSourceCommand({ kpId: '8', key: '', duration: 7200 }),
    );

    expect(emptyResult.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(emptyResult.errorField).toEqual(expectedError);

    const blankResult = await handler.execute(
      new ReplaceFilmSourceCommand({ kpId: '8', key: '   ', duration: 7200 }),
    );

    expect(blankResult.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(blankResult.errorField).toEqual(expectedError);

    const nullResult = await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '8',
        key: null as unknown as string,
        duration: 7200,
      }),
    );

    expect(nullResult.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(nullResult.errorField).toEqual(expectedError);

    const after = await filmRepository.getFilmByKinopoiskId('8');
    expect(after?.videoUrl).toBe(before?.videoUrl);
    expect(after?.duration).toBe(before?.duration);
  });
});
