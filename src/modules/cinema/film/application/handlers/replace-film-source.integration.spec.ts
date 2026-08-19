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
  ReplaceFilmSourceCommand,
  ReplaceFilmSourceCommandHandler,
} from '@/films/application/handlers/replace-film-source.handler';

describe('ReplaceFilmSourceCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: ReplaceFilmSourceCommandHandler;
  let newFilmHandler: NewFilmNotificationCommandHandler;
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

  it('не трогает метаданные, постеры и статус', async () => {
    await publishFilm('1', 'https://s3/films/aaa_1/master.m3u8', 6000);
    const before = await filmRepository.getFilmByKinopoiskId('1');

    await handler.execute(
      new ReplaceFilmSourceCommand({
        kpId: '1',
        key: 'https://s3/films/bbb_1/master.m3u8',
        duration: 7200,
      }),
    );

    const after = await filmRepository.getFilmByKinopoiskId('1');
    expect(after?.title).toBe(before?.title);
    expect(after?.description).toBe(before?.description);
    expect(after?.previewUrl).toBe(before?.previewUrl);
    expect(after?.titleUrl).toBe(before?.titleUrl);
    expect(after?.backgroundContentUrl).toBe(before?.backgroundContentUrl);
    expect(after?.releaseDate).toBe(before?.releaseDate);
    expect(after?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(after?.isHidden).toBe(before?.isHidden);
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
});
