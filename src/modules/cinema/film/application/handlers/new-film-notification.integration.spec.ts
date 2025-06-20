import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { NewFilmNotificationPayloadDto } from '@/films/domain/types';
import {
  NewFilmNotificationCommand,
  NewFilmNotificationCommandHandler,
} from '@/films/application/handlers/new-film-notification.handler';
import {
  NewFilmIsHandleNotificationCommand,
  NewFilmIsHandleNotificationCommandHandler,
} from '@/films/application/handlers/new-film-is-handle-notification.handler';

describe('NewFilmNotificationCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: NewFilmNotificationCommandHandler;
  let handlerIsHandling: NewFilmIsHandleNotificationCommandHandler;
  let filmRepository: FilmRepository;
  let kinopoiskService: KinopoiskService;
  let testService: TestService;

  const newFilmData: NewFilmNotificationPayloadDto = {
    key: 'key',
    kpId: '1',
    duration: 1000,
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(NewFilmNotificationCommandHandler);
    handlerIsHandling = app.get(NewFilmIsHandleNotificationCommandHandler);
    filmRepository = app.get(FilmRepository);
    kinopoiskService = app.get(KinopoiskService);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  it('should add new film', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy.mockResolvedValueOnce({
      name: `Film 1`,
      enName: `FilmEn 1`,
      alternativeName: `AltName 1`,
      year: 2020,
      countries: [{ name: 'Country1' }],
      description: `Description 1`,
      genres: [{ name: 'Боевик' }],
      premiere: { world: '2022-01-01' },
    });

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result = await handler.execute(new NewFilmNotificationCommand(newFilmData));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalled();
      expect(filmRepositorySaveSpy).toHaveBeenCalled();
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const film = await filmRepository.getFilmByKinopoiskId('1');

    expect(film).not.toBeNull();
    expect(film?.title).toBe('Film 1');
    expect(film?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(film?.isHidden).toBeFalsy();
  });

  it('should add new film without all information', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy.mockResolvedValueOnce({
      name: `Film 1`,
      enName: `FilmEn 1`,
      alternativeName: `AltName 1`,
      year: 2020,
      description: `Description 1`,
    });

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result = await handler.execute(new NewFilmNotificationCommand(newFilmData));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalled();
      expect(filmRepositorySaveSpy).toHaveBeenCalled();
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const film = await filmRepository.getFilmByKinopoiskId('1');

    expect(film).not.toBeNull();
    expect(film?.title).toBe('Film 1');
    expect(film?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(film?.isHidden).toBeTruthy();
  });

  it('should send notification about handling new film, then notification about new downloading film. Film schould be updated', async () => {
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

    const result = await handlerIsHandling.execute(
      new NewFilmIsHandleNotificationCommand({ kpIds }),
    );

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
    expect(film1?.duration).toBe(0);
    expect(film2?.duration).toBe(0);
    expect(film1?.country).toEqual(['Country1']);
    expect(film2?.country).toEqual(['Country2']);

    // Notification about new film
    const kinopoiskServiceSpy2 = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy2.mockResolvedValueOnce({
      name: `Updated films 1`,
      enName: `Updated films en 1`,
      alternativeName: `Updated films AltName 1`,
      year: 2021,
      countries: [{ name: 'Country3' }],
      description: `Updated films Description 1`,
      genres: [{ name: 'Драма' }],
      premiere: { world: '2022-01-01' },
    });

    const filmRepositorySaveSpy2 = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy2 = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result2 = await handler.execute(
      new NewFilmNotificationCommand({ kpId: '1', duration: 5000, key: 'keys' }),
    );

    kinopoiskServiceSpy2.mockRestore();

    const kinopoiskServiceSpy3 = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy3.mockResolvedValueOnce({
      name: `Updated films 2`,
      enName: `Updated films en 2`,
      alternativeName: `Updated films AltName 2`,
      year: 2022,
      premiere: { world: '2022-01-01' },
    });

    const result3 = await handler.execute(
      new NewFilmNotificationCommand({ kpId: '2', duration: 2000, key: 'key' }),
    );

    kinopoiskServiceSpy3.mockRestore();

    try {
      expect(result2.appResult).toBe(AppNotificationResultEnum.Success);
      expect(result3.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositorySaveSpy2).toHaveBeenCalledTimes(2);
      expect(filmRepositoryGetFilmByKpIdSpy2).toHaveBeenCalledTimes(2);
    } finally {
      filmRepositorySaveSpy2.mockRestore();
      filmRepositoryGetFilmByKpIdSpy2.mockRestore();
    }

    const [film3, film4] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
    ]);

    expect(film3).not.toBeNull();
    expect(film4).not.toBeNull();
    expect(film3?.title).toBe('Updated films 1');
    expect(film4?.title).toBe('Updated films 2');
    expect(film3?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(film4?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(film3?.isHidden).toBeFalsy();
    expect(film4?.isHidden).toBeTruthy();
    expect(film3?.duration).toBe(5000);
    expect(film4?.duration).toBe(2000);
    expect(film3?.country).toEqual(['Country3']);
    expect(film4?.country).toBeNull();
  });

  it('should send notification about handling new film, then notification about new downloading film then try send notification again but film already exist', async () => {
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

    const result = await handlerIsHandling.execute(
      new NewFilmIsHandleNotificationCommand({ kpIds }),
    );

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
    expect(film1?.duration).toBe(0);
    expect(film2?.duration).toBe(0);
    expect(film1?.country).toEqual(['Country1']);
    expect(film2?.country).toEqual(['Country2']);

    // Notification about new film
    const kinopoiskServiceSpy2 = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy2.mockResolvedValueOnce({
      name: `Updated films 1`,
      enName: `Updated films en 1`,
      alternativeName: `Updated films AltName 1`,
      year: 2021,
      countries: [{ name: 'Country3' }],
      description: `Updated films Description 1`,
      genres: [{ name: 'Драма' }],
      premiere: { world: '2022-01-01' },
    });

    const filmRepositorySaveSpy2 = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy2 = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result2 = await handler.execute(
      new NewFilmNotificationCommand({ kpId: '1', duration: 5000, key: 'keys' }),
    );

    kinopoiskServiceSpy2.mockRestore();

    const kinopoiskServiceSpy3 = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy3.mockResolvedValueOnce({
      name: `Updated films 2`,
      enName: `Updated films en 2`,
      alternativeName: `Updated films AltName 2`,
      year: 2022,
      premiere: { world: '2022-01-01' },
    });

    const result3 = await handler.execute(
      new NewFilmNotificationCommand({ kpId: '2', duration: 2000, key: 'key' }),
    );

    kinopoiskServiceSpy3.mockRestore();

    try {
      expect(result2.appResult).toBe(AppNotificationResultEnum.Success);
      expect(result3.appResult).toBe(AppNotificationResultEnum.Success);
      expect(filmRepositorySaveSpy2).toHaveBeenCalledTimes(2);
      expect(filmRepositoryGetFilmByKpIdSpy2).toHaveBeenCalledTimes(2);
    } finally {
      filmRepositorySaveSpy2.mockRestore();
      filmRepositoryGetFilmByKpIdSpy2.mockRestore();
    }

    const [film3, film4] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
    ]);

    expect(film3).not.toBeNull();
    expect(film4).not.toBeNull();
    expect(film3?.title).toBe('Updated films 1');
    expect(film4?.title).toBe('Updated films 2');
    expect(film3?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(film4?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(film3?.isHidden).toBeFalsy();
    expect(film4?.isHidden).toBeTruthy();
    expect(film3?.duration).toBe(5000);
    expect(film4?.duration).toBe(2000);
    expect(film3?.country).toEqual(['Country3']);
    expect(film4?.country).toBeNull();

    const kinopoiskServiceSpy4 = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy4
      .mockResolvedValueOnce({
        name: `Updated films 3`,
        enName: `Updated films en 3`,
        alternativeName: `Updated films AltName 3`,
        year: 2021,
        countries: [{ name: 'Country3' }],
        description: `Updated films Description 3`,
        genres: [{ name: 'Драма' }],
        premiere: { world: '2022-01-01' },
      })
      .mockResolvedValueOnce({
        name: `Updated films 4`,
        enName: `Updated films en 4`,
        alternativeName: `Updated films AltName 4`,
        year: 2021,
        countries: [{ name: 'Country3' }],
        description: `Updated films Description 4`,
        genres: [{ name: 'Драма' }],
        premiere: { world: '2022-01-01' },
      });

    const filmRepositorySaveSpy3 = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy3 = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result4 = await handler.execute(
      new NewFilmNotificationCommand({ kpId: '1', duration: 5000, key: 'keys' }),
    );
    const result5 = await handler.execute(
      new NewFilmNotificationCommand({ kpId: '2', duration: 2000, key: 'key' }),
    );

    kinopoiskServiceSpy4.mockRestore();

    try {
      expect(result4.appResult).toBe(AppNotificationResultEnum.BadRequest);
      expect(result5.appResult).toBe(AppNotificationResultEnum.BadRequest);

      expect(result4.errorField).toEqual({
        errorKey: EXCEPTION_KEYS_ENUM.FILM_ALREADY_EXIST,
        message: expect.any(String),
        field: 'kpId',
      });
      expect(result5.errorField).toEqual({
        errorKey: EXCEPTION_KEYS_ENUM.FILM_ALREADY_EXIST,
        message: expect.any(String),
        field: 'kpId',
      });
      expect(filmRepositorySaveSpy3).toHaveBeenCalledTimes(0);
      expect(filmRepositoryGetFilmByKpIdSpy3).toHaveBeenCalledTimes(2);
    } finally {
      filmRepositorySaveSpy3.mockRestore();
      filmRepositoryGetFilmByKpIdSpy3.mockRestore();
    }

    const [film5, film6] = await Promise.all([
      filmRepository.getFilmByKinopoiskId('1'),
      filmRepository.getFilmByKinopoiskId('2'),
    ]);

    expect(film5).not.toBeNull();
    expect(film6).not.toBeNull();
    expect(film5?.title).toBe('Updated films 1');
    expect(film6?.title).toBe('Updated films 2');
    expect(film5?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(film6?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(film5?.isHidden).toBeFalsy();
    expect(film6?.isHidden).toBeTruthy();
    expect(film5?.duration).toBe(5000);
    expect(film6?.duration).toBe(2000);
    expect(film5?.country).toEqual(['Country3']);
    expect(film6?.country).toBeNull();
  });

  it('should not add new film, kp movie not found', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy.mockResolvedValue(null);

    const filmRepositorySaveSpy = jest.spyOn(filmRepository, 'save');
    const filmRepositoryGetFilmByKpIdSpy = jest.spyOn(filmRepository, 'getFilmByKinopoiskId');

    const result = await handler.execute(new NewFilmNotificationCommand(newFilmData));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
      expect(result.errorField).toEqual({
        errorKey: EXCEPTION_KEYS_ENUM.KP_MOVIE_NOT_FOUND,
        message: expect.any(String),
        field: 'kpId',
      });
      expect(filmRepositoryGetFilmByKpIdSpy).toHaveBeenCalled();
      expect(filmRepositorySaveSpy).toHaveBeenCalledTimes(0);
    } finally {
      filmRepositorySaveSpy.mockRestore();
      filmRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const film = await filmRepository.getFilmByKinopoiskId('1');

    expect(film).toBeNull();
  });
});
