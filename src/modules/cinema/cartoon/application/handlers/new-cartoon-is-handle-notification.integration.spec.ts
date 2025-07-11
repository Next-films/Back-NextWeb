import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import {
  NewCartoonIsHandleNotificationCommand,
  NewCartoonIsHandleNotificationCommandHandler,
} from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';

// TODO: Доработать тесты переписать под новую логику
describe('NewCartoonIsHandleNotificationCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: NewCartoonIsHandleNotificationCommandHandler;
  let cartoonRepository: CartoonRepository;
  let kinopoiskService: KinopoiskService;
  let testService: TestService;
  let genreRepository: GenreRepository;
  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(NewCartoonIsHandleNotificationCommandHandler);
    cartoonRepository = app.get(CartoonRepository);
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

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handler.execute(new NewCartoonIsHandleNotificationCommand({ kpIds }));

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
  });

  it('should process cartoons, then again but should not process and save again, cartoons already exist', async () => {
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

    const result = await handler.execute(new NewCartoonIsHandleNotificationCommand({ kpIds }));

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

    const kinopoiskServiceSpy2 = jest.spyOn(kinopoiskService, 'getMovieById');
    kinopoiskServiceSpy2.mockResolvedValueOnce(films_data[1]).mockResolvedValueOnce(films_data[0]);

    const cartoonRepositorySaveSpy2 = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy2 = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result2 = await handler.execute(new NewCartoonIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy2.mockRestore();

    try {
      expect(result2.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositorySaveSpy2).toHaveBeenCalledTimes(0);
      expect(cartoonRepositoryGetFilmByKpIdSpy2).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      cartoonRepositorySaveSpy2.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy2.mockRestore();
    }
  });

  it('should not process cartoons, movie not found by kp id', async () => {
    const kinopoiskServiceSpy = jest.spyOn(kinopoiskService, 'getMovieById');
    const kpIds = ['1', '2'];

    kinopoiskServiceSpy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    const result = await handler.execute(new NewCartoonIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.Success);
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(kpIds.length);
      expect(cartoonRepositorySaveSpy).toHaveBeenCalledTimes(0);
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [cartoon1, cartoon2] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
    ]);

    expect(cartoon1).toBeNull();
    expect(cartoon2).toBeNull();
  });

  it('should not process cartoon, error. Should rollback transaction', async () => {
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

    const cartoonRepositorySaveSpy = jest.spyOn(cartoonRepository, 'save');
    const cartoonRepositoryGetFilmByKpIdSpy = jest.spyOn(
      cartoonRepository,
      'getCartoonByKinopoiskId',
    );

    cartoonRepositorySaveSpy
      .mockImplementationOnce(cartoonRepository.save.bind(cartoonRepository))
      .mockImplementationOnce(() => {
        throw new Error('Save failed on second call');
      });

    const result = await handler.execute(new NewCartoonIsHandleNotificationCommand({ kpIds }));

    kinopoiskServiceSpy.mockRestore();

    try {
      expect(result.appResult).toBe(AppNotificationResultEnum.InternalError);
      expect(cartoonRepositoryGetFilmByKpIdSpy).toHaveBeenCalledTimes(1);
      expect(cartoonRepositorySaveSpy).toHaveBeenCalledTimes(kpIds.length);
    } finally {
      cartoonRepositorySaveSpy.mockRestore();
      cartoonRepositoryGetFilmByKpIdSpy.mockRestore();
    }

    const [cartoon1, cartoon2, genre] = await Promise.all([
      cartoonRepository.getCartoonByKinopoiskId('1'),
      cartoonRepository.getCartoonByKinopoiskId('2'),
      genreRepository.getByName('Тестовый жанр'),
    ]);

    expect(cartoon1).toBeNull();
    expect(cartoon2).toBeNull();
    expect(genre).toBeNull();
  });
});
