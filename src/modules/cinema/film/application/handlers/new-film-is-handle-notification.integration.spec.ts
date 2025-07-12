import {
  NewFilmIsHandleNotificationCommand,
  NewFilmIsHandleNotificationCommandHandler,
} from '@/films/application/handlers/new-film-is-handle-notification.handler';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';

describe('NewFilmIsHandleNotificationCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: NewFilmIsHandleNotificationCommandHandler;
  let filmRepository: FilmRepository;
  let kinopoiskService: KinopoiskService;
  let testService: TestService;
  let genreRepository: GenreRepository;

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(NewFilmIsHandleNotificationCommandHandler);
    filmRepository = app.get(FilmRepository);
    kinopoiskService = app.get(KinopoiskService);
    genreRepository = app.get(GenreRepository);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process all kpIds and commit transaction', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');
    const kpIds = ['1', '2'];

    kinopoiskServiceSpy
      .mockResolvedValueOnce({
        name: `Film 1`,
        enName: `FilmEn 1`,
        alternativeName: `AltName 1`,
        year: 2020,
        countries: [{ name: 'Country1' }],
        description: `Description 1`,
        genres: [{ name: 'Боевик' }],
        premiere: { world: '2022-01-01' },
      })
      .mockResolvedValueOnce({
        name: `Film 2`,
        enName: `FilmEn 2`,
        alternativeName: `AltName 2`,
        year: 2021,
        countries: [{ name: 'Country2' }],
        description: `Description 2`,
        genres: [{ name: 'Комедия' }],
        premiere: { world: '2023-05-05' },
      });

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result = await handler.execute(new NewFilmIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(kpIds.length);
      expect(filmRepositorySaveSpy).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [film1, film2] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
    ]);

    expect(film1).not.toBeNull();
    expect(film2).not.toBeNull();
    expect(film1?.title).toBe('Film 1');
    expect(film2?.title).toBe('Film 2');
    expect(film1?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(film2?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(film1?.isHidden).toBeTruthy();
    expect(film2?.isHidden).toBeTruthy();
  });

  it('should process films, then again but should not process and save again, films already exist', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');
    const kpIds = ['1', '2'];

    const films_data = [
      {
        name: `Film 1`,
        enName: `FilmEn 1`,
        alternativeName: `AltName 1`,
        year: 2020,
        countries: [{ name: 'Country1' }],
        description: `Description 1`,
        genres: [{ name: 'Боевик' }],
        premiere: { world: '2022-01-01' },
      },
      {
        name: `Film 2`,
        enName: `FilmEn 2`,
        alternativeName: `AltName 2`,
        year: 2021,
        countries: [{ name: 'Country2' }],
        description: `Description 2`,
        genres: [{ name: 'Комедия' }],
        premiere: { world: '2023-05-05' },
      },
    ];
    kinopoiskServiceSpy.mockResolvedValueOnce(films_data[0]).mockResolvedValueOnce(films_data[1]);

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result = await handler.execute(new NewFilmIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(kpIds.length);
      expect(filmRepositorySaveSpy).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [film1, film2] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
    ]);

    expect(film1).not.toBeNull();
    expect(film2).not.toBeNull();
    expect(film1?.title).toBe('Film 1');
    expect(film2?.title).toBe('Film 2');
    expect(film1?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(film2?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(film1?.isHidden).toBeTruthy();
    expect(film2?.isHidden).toBeTruthy();

    const kinopoiskServiceSpy2 = jest.spyOn(kinopoiskService, 'getMovieById');
    kinopoiskServiceSpy2.mockResolvedValueOnce(films_data[1]).mockResolvedValueOnce(films_data[0]);

    const filmRepositorySaveSpy2 = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy2 = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result2 = await handler.execute(new NewFilmIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy2.mockRestore();

    try {
      expect(result2.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositorySaveSpy2).toHaveBeenCalledTimes(0);
      expect(filmRepositoryGetFilmByKpIdSpy2).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      filmRepositorySaveSpy2.mockRestore();
      filmRepositoryGetFilmByKpIdSpy2.mockRestore();
    }
  });

  it('should not process films, movie not found by kp id', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');
    const kpIds = ['1', '2'];

    kinopoiskServiceSpy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result = await handler.execute(new NewFilmIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(kpIds.length);
      expect(filmRepositorySaveSpy).toHaveBeenCalledTimes(0);
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [film1, film2] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
    ]);

    expect(film1).toBeNull();
    expect(film2).toBeNull();
  });

  it('should not process films, error. Should rollback transaction', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');
    const kpIds = ['1', '2'];

    const films_data = [
      {
        name: `Film 1`,
        enName: `FilmEn 1`,
        alternativeName: `AltName 1`,
        year: 2020,
        countries: [{ name: 'Country1' }],
        description: `Description 1`,
        genres: [{ name: 'Боевик' }],
        premiere: { world: '2022-01-01' },
      },
      {
        name: `Film 2`,
        enName: `FilmEn 2`,
        alternativeName: `AltName 2`,
        year: 2021,
        countries: [{ name: 'Country2' }],
        description: `Description 2`,
        genres: [{ name: 'Тестовый жанр' }],
        premiere: { world: '2023-05-05' },
      },
    ];
    kinopoiskServiceSpy.mockResolvedValueOnce(films_data[0]).mockResolvedValueOnce(films_data[1]);

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    filmRepositorySaveSpy
      .mockImplementationOnce(filmRepository.save.bind(filmRepository))
      .mockImplementationOnce(() => {
        throw new Error('Save failed on second call');
      });

    const result = await handler.execute(new NewFilmIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.InternalError);
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(1);
      expect(filmRepositorySaveSpy).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [film1, film2, genre] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
      genreRepository.getByName('Тестовый жанр'),
    ]);

    expect(film1).toBeNull();
    expect(film2).toBeNull();
    expect(genre).toBeNull();
  });
});
