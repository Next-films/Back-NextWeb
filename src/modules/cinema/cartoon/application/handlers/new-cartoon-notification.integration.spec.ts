import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import {
  NewCartoonIsHandleNotificationCommand,
  NewCartoonIsHandleNotificationCommandHandler,
} from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import {
  NewCartoonNotificationCommand,
  NewCartoonNotificationCommandHandler,
} from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { NewCartoonNotificationPayloadDto } from '@/cartoons/api/dtos/input/new-cartoon-notification.input.dto';

describe('NewCartoonNotificationCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: NewCartoonNotificationCommandHandler;
  let handlerIsHandling: NewCartoonIsHandleNotificationCommandHandler;
  let cartoonRepository: CartoonRepository;
  let kinopoiskService: KinopoiskService;
  let testService: TestService;

  const newCartoonData: NewCartoonNotificationPayloadDto = {
    key: 'key',
    kpId: '1',
    duration: 1000,
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(NewCartoonNotificationCommandHandler);
    handlerIsHandling = app.get(NewCartoonIsHandleNotificationCommandHandler);
    cartoonRepository = app.get(CartoonRepository);
    kinopoiskService = app.get(KinopoiskService);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should add new cartoon', async () => {
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

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handler.execute(new NewCartoonNotificationCommand(newCartoonData));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalled();
      expect(cartoonRepositorySaveSpy).toHaveBeenCalled();
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const cartoon = await cartoonRepository.getCartoonByKinopoiskId('1');

    expect(cartoon).not.toBeNull();
    expect(cartoon?.title).toBe('Film 1');
    expect(cartoon?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(cartoon?.isHidden).toBeFalsy();
  });

  it('should add new cartoon without all information', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy.mockResolvedValueOnce({
      name: `Film 1`,
      enName: `FilmEn 1`,
      alternativeName: `AltName 1`,
      year: 2020,
      description: `Description 1`,
    });

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handler.execute(new NewCartoonNotificationCommand(newCartoonData));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalled();
      expect(cartoonRepositorySaveSpy).toHaveBeenCalled();
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const cartoon = await cartoonRepository.getCartoonByKinopoiskId('1');

    expect(cartoon).not.toBeNull();
    expect(cartoon?.title).toBe('Film 1');
    expect(cartoon?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(cartoon?.isHidden).toBeTruthy();
  });

  it('should send notification about handling new cartoon, then notification about new downloading cartoon. Cartoon schould be updated', async () => {
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

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handlerIsHandling.execute(
      new NewCartoonIsHandleNotificationCommand({ kpIds }),
    );

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(kpIds.length);
      expect(cartoonRepositorySaveSpy).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [cartoon1, cartoon2] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
    ]);

    expect(cartoon1).not.toBeNull();
    expect(cartoon2).not.toBeNull();
    expect(cartoon1?.title).toBe('Film 1');
    expect(cartoon2?.title).toBe('Film 2');
    expect(cartoon1?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(cartoon2?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(cartoon1?.isHidden).toBeTruthy();
    expect(cartoon2?.isHidden).toBeTruthy();
    expect(cartoon1?.duration).toBe(0);
    expect(cartoon2?.duration).toBe(0);
    expect(cartoon1?.country).toEqual(['Country1']);
    expect(cartoon2?.country).toEqual(['Country2']);

    // Notification about new cartoon
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

    const cartoonRepositorySaveSpy2 = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy2 = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result2 = await handler.execute(
      new NewCartoonNotificationCommand({ kpId: '1', duration: 5000, key: 'keys' }),
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
      new NewCartoonNotificationCommand({ kpId: '2', duration: 2000, key: 'key' }),
    );

    kinopoiskServiceSpy3.mockRestore();

    try {
      expect(result2.appResult).toBe(AppNotificationResultEnum.Success);
      expect(result3.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositorySaveSpy2).toHaveBeenCalledTimes(2);
      expect(cartoonRepositoryGetFilmByKpIdSpy2).toHaveBeenCalledTimes(2);
    } finally {
      cartoonRepositorySaveSpy2.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy2.mockRestore();
    }

    const [cartoon3, cartoon4] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
    ]);

    // TODO: Если PRODUCTION тогда isHidden = false. Как будет понятно со всей логикой пофиксить тест - cartoon3
    expect(cartoon3).not.toBeNull();
    expect(cartoon4).not.toBeNull();
    expect(cartoon3?.title).toBe('Updated films 1');
    expect(cartoon4?.title).toBe('Updated films 2');
    expect(cartoon3?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(cartoon4?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(cartoon3?.isHidden).toBeTruthy();
    expect(cartoon4?.isHidden).toBeTruthy();
    expect(cartoon3?.duration).toBe(5000);
    expect(cartoon4?.duration).toBe(2000);
    expect(cartoon3?.country).toEqual(['Country3']);
    expect(cartoon4?.country).toBeNull();
  });

  it('should send notification about handling new cartoon, then notification about new downloading cartoon then try send notification again but cartoon already exist', async () => {
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

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handlerIsHandling.execute(
      new NewCartoonIsHandleNotificationCommand({ kpIds }),
    );

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(kpIds.length);
      expect(cartoonRepositorySaveSpy).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [cartoon1, cartoon2] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
    ]);

    expect(cartoon1).not.toBeNull();
    expect(cartoon2).not.toBeNull();
    expect(cartoon1?.title).toBe('Film 1');
    expect(cartoon2?.title).toBe('Film 2');
    expect(cartoon1?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(cartoon2?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(cartoon1?.isHidden).toBeTruthy();
    expect(cartoon2?.isHidden).toBeTruthy();
    expect(cartoon1?.duration).toBe(0);
    expect(cartoon2?.duration).toBe(0);
    expect(cartoon1?.country).toEqual(['Country1']);
    expect(cartoon2?.country).toEqual(['Country2']);

    // Notification about new cartoon
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

    const cartoonRepositorySaveSpy2 = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy2 = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result2 = await handler.execute(
      new NewCartoonNotificationCommand({ kpId: '1', duration: 5000, key: 'keys' }),
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
      new NewCartoonNotificationCommand({ kpId: '2', duration: 2000, key: 'key' }),
    );

    kinopoiskServiceSpy3.mockRestore();

    try {
      expect(result2.appResult).toBe(AppNotificationResultEnum.Success);
      expect(result3.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositorySaveSpy2).toHaveBeenCalledTimes(2);
      expect(cartoonRepositoryGetFilmByKpIdSpy2).toHaveBeenCalledTimes(2);
    } finally {
      cartoonRepositorySaveSpy2.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy2.mockRestore();
    }

    const [cartoon3, cartoon4] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
    ]);

    // TODO: Если PRODUCTION тогда isHidden = false. Как будет понятно со всей логикой пофиксить тест - cartoon3
    expect(cartoon3).not.toBeNull();
    expect(cartoon4).not.toBeNull();
    expect(cartoon3?.title).toBe('Updated films 1');
    expect(cartoon4?.title).toBe('Updated films 2');
    expect(cartoon3?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(cartoon4?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(cartoon3?.isHidden).toBeTruthy();
    expect(cartoon4?.isHidden).toBeTruthy();
    expect(cartoon3?.duration).toBe(5000);
    expect(cartoon4?.duration).toBe(2000);
    expect(cartoon3?.country).toEqual(['Country3']);
    expect(cartoon4?.country).toBeNull();

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

    const cartoonRepositorySaveSpy3 = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy3 = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result4 = await handler.execute(
      new NewCartoonNotificationCommand({ kpId: '1', duration: 5000, key: 'keys' }),
    );
    const result5 = await handler.execute(
      new NewCartoonNotificationCommand({ kpId: '2', duration: 2000, key: 'key' }),
    );

    kinopoiskServiceSpy4.mockRestore();

    try {
      expect(result4.appResult).toBe(AppNotificationResultEnum.BadRequest);
      expect(result5.appResult).toBe(AppNotificationResultEnum.BadRequest);

      expect(result4.errorField).toEqual({
        errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ALREADY_EXIST,
        message: expect.any(String),
        field: 'kpId',
      });
      expect(result5.errorField).toEqual({
        errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ALREADY_EXIST,
        message: expect.any(String),
        field: 'kpId',
      });
      expect(cartoonRepositorySaveSpy3).toHaveBeenCalledTimes(0);
      expect(cartoonRepositoryGetFilmByKpIdSpy3).toHaveBeenCalledTimes(2);
    } finally {
      cartoonRepositorySaveSpy3.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy3.mockRestore();
    }

    const [cartoon5, cartoon6] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
    ]);

    // TODO: Если PRODUCTION тогда isHidden = false. Как будет понятно со всей логикой пофиксить тест - cartoon5
    expect(cartoon5).not.toBeNull();
    expect(cartoon6).not.toBeNull();
    expect(cartoon5?.title).toBe('Updated films 1');
    expect(cartoon6?.title).toBe('Updated films 2');
    expect(cartoon5?.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
    expect(cartoon6?.handleStatus).toBe(MovieHandleStatus.MODERATE);
    expect(cartoon5?.isHidden).toBeTruthy();
    expect(cartoon6?.isHidden).toBeTruthy();
    expect(cartoon5?.duration).toBe(5000);
    expect(cartoon6?.duration).toBe(2000);
    expect(cartoon5?.country).toEqual(['Country3']);
    expect(cartoon6?.country).toBeNull();
  });

  it('should not add new cartoon, kp movie not found', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskServiceSpy.mockResolvedValue(null);

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handler.execute(new NewCartoonNotificationCommand(newCartoonData));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
      expect(result.errorField).toEqual({
        errorKey: EXCEPTION_KEYS_ENUM.KP_MOVIE_NOT_FOUND,
        message: expect.any(String),
        field: 'kpId',
      });
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalled();
      expect(cartoonRepositorySaveSpy).toHaveBeenCalledTimes(0);
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const cartoon = await cartoonRepository.getCartoonByKinopoiskId('1');

    expect(cartoon).toBeNull();
  });
});
