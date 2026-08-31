import { INestApplication } from '@nestjs/common';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { TestService } from 'test/test.service';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MovieHandleStatus } from '@/movies/domain/types';
import {
  NewCartoonNotificationCommand,
  NewCartoonNotificationCommandHandler,
} from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import {
  NewCartoonIsHandleNotificationCommand,
  NewCartoonIsHandleNotificationCommandHandler,
} from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import {
  ReplaceCartoonSourceCommand,
  ReplaceCartoonSourceCommandHandler,
} from '@/cartoons/application/handlers/replace-cartoon-source.handler';

describe('ReplaceCartoonSourceCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: ReplaceCartoonSourceCommandHandler;
  let newCartoonHandler: NewCartoonNotificationCommandHandler;
  let newCartoonIsHandleHandler: NewCartoonIsHandleNotificationCommandHandler;
  let cartoonRepository: CartoonRepository;
  let kinopoiskService: KinopoiskService;
  let testService: TestService;

  const kpMovieFull = {
    name: 'Мультфильм',
    enName: 'Cartoon',
    alternativeName: 'Cartoon',
    year: 2026,
    countries: [{ name: 'США' }],
    description: 'Описание',
    genres: [{ name: 'Мультфильм' }],
    premiere: { world: '2026-01-01' },
    poster: { url: 'https://poster.com' },
    logo: { url: 'https://logo.com' },
    videos: { trailers: [{ site: 'youtube', url: 'https://youtube.com' }] },
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(ReplaceCartoonSourceCommandHandler);
    newCartoonHandler = app.get(NewCartoonNotificationCommandHandler);
    newCartoonIsHandleHandler = app.get(NewCartoonIsHandleNotificationCommandHandler);
    cartoonRepository = app.get(CartoonRepository);
    kinopoiskService = app.get(KinopoiskService);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  const publishCartoon = async (kpId: string, key: string, duration: number) => {
    const spy = jest.spyOn(kinopoiskService, 'getMovieById');
    spy.mockResolvedValueOnce(kpMovieFull);
    await newCartoonHandler.execute(new NewCartoonNotificationCommand({ kpId, key, duration }));
    spy.mockRestore();
  };

  it('заменяет videoUrl и duration, возвращает прежнюю ссылку', async () => {
    await publishCartoon('1', 'https://s3/cartoons/aaa_1/master.m3u8', 6000);

    const result = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '1',
        key: 'https://s3/cartoons/bbb_1/master.m3u8',
        duration: 7200,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
    expect(result.data).toEqual({ previousVideoUrl: 'https://s3/cartoons/aaa_1/master.m3u8' });

    const cartoon = await cartoonRepository.getCartoonByKinopoiskId('1');
    expect(cartoon?.videoUrl).toBe('https://s3/cartoons/bbb_1/master.m3u8');
    expect(cartoon?.duration).toBe(7200);
  });

  it('не трогает метаданные, постеры, статус и жанры', async () => {
    await publishCartoon('1', 'https://s3/cartoons/aaa_1/master.m3u8', 6000);
    const beforeShallow = await cartoonRepository.getCartoonByKinopoiskId('1');
    const before = await cartoonRepository.getCartoonById(beforeShallow!.id);

    await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '1',
        key: 'https://s3/cartoons/bbb_1/master.m3u8',
        duration: 7200,
      }),
    );

    const after = await cartoonRepository.getCartoonById(beforeShallow!.id);
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

  it('возвращает NotFound, если мультфильма нет', async () => {
    const result = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '404',
        key: 'https://s3/cartoons/bbb_404/master.m3u8',
        duration: 7200,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.NotFound);
    expect(result.errorField).toEqual({
      errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
      message: expect.any(String),
      field: 'kpId',
    });
  });

  it('отказывает, если мультфильм на модерации, и не меняет videoUrl', async () => {
    const spy = jest.spyOn(kinopoiskService, 'getMovieById');
    spy.mockResolvedValueOnce({ name: 'Мультфильм', enName: 'Cartoon', year: 2026 });
    await newCartoonHandler.execute(
      new NewCartoonNotificationCommand({
        kpId: '2',
        key: 'https://s3/cartoons/aaa_2/master.m3u8',
        duration: 100,
      }),
    );
    spy.mockRestore();

    const before = await cartoonRepository.getCartoonByKinopoiskId('2');
    expect(before?.handleStatus).toBe(MovieHandleStatus.MODERATE);

    const result = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '2',
        key: 'https://s3/cartoons/bbb_2/master.m3u8',
        duration: 200,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(result.errorField).toEqual({
      errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ON_MODERATION,
      message: expect.any(String),
      field: 'kpId',
    });

    const after = await cartoonRepository.getCartoonByKinopoiskId('2');
    expect(after?.videoUrl).toBe(before?.videoUrl);
  });

  it('отказывает, если мультфильм ещё не опубликован (PROCESSING), и не меняет videoUrl', async () => {
    const spy = jest.spyOn(kinopoiskService, 'getMovieById');
    spy.mockResolvedValueOnce({ name: 'Мультфильм 3', enName: 'Cartoon 3', year: 2026 });
    await newCartoonIsHandleHandler.execute(
      new NewCartoonIsHandleNotificationCommand({ kpIds: ['3'] }),
    );
    spy.mockRestore();

    const before = await cartoonRepository.getCartoonByKinopoiskId('3');
    expect(before?.handleStatus).toBe(MovieHandleStatus.PROCESSING);
    expect(before?.videoUrl).toBeNull();

    const result = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '3',
        key: 'https://s3/cartoons/bbb_3/master.m3u8',
        duration: 300,
      }),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(result.errorField).toEqual({
      errorKey: EXCEPTION_KEYS_ENUM.CARTOON_SOURCE_NOT_REPLACEABLE,
      message: expect.any(String),
      field: 'kpId',
    });

    const after = await cartoonRepository.getCartoonByKinopoiskId('3');
    expect(after?.videoUrl).toBe(before?.videoUrl);
  });

  it('откатывает транзакцию при ошибке сохранения, не меняя videoUrl и duration', async () => {
    await publishCartoon('5', 'https://s3/cartoons/aaa_5/master.m3u8', 6000);
    const before = await cartoonRepository.getCartoonByKinopoiskId('5');

    const saveSpy = jest.spyOn(cartoonRepository, 'save').mockRejectedValueOnce(new Error('boom'));

    let result;
    try {
      result = await handler.execute(
        new ReplaceCartoonSourceCommand({
          kpId: '5',
          key: 'https://s3/cartoons/bbb_5/master.m3u8',
          duration: 9000,
        }),
      );
    } finally {
      saveSpy.mockRestore();
    }

    expect(result.appResult).toBe(AppNotificationResultEnum.InternalError);

    const after = await cartoonRepository.getCartoonByKinopoiskId('5');
    expect(after?.videoUrl).toBe(before?.videoUrl);
    expect(after?.duration).toBe(before?.duration);
  });

  it('повторный вызов с тем же ключом идемпотентен: Success, previousVideoUrl = null', async () => {
    await publishCartoon('7', 'https://s3/cartoons/aaa_7/master.m3u8', 6000);

    const first = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '7',
        key: 'https://s3/cartoons/bbb_7/master.m3u8',
        duration: 7200,
      }),
    );

    expect(first.appResult).toBe(AppNotificationResultEnum.Success);
    expect(first.data).toEqual({ previousVideoUrl: 'https://s3/cartoons/aaa_7/master.m3u8' });

    const replay = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '7',
        key: 'https://s3/cartoons/bbb_7/master.m3u8',
        duration: 7200,
      }),
    );

    expect(replay.appResult).toBe(AppNotificationResultEnum.Success);
    expect(replay.data).toEqual({ previousVideoUrl: null });

    const cartoon = await cartoonRepository.getCartoonByKinopoiskId('7');
    expect(cartoon?.videoUrl).toBe('https://s3/cartoons/bbb_7/master.m3u8');
    expect(cartoon?.duration).toBe(7200);
  });

  it('отклоняет пустой key и не меняет videoUrl', async () => {
    await publishCartoon('8', 'https://s3/cartoons/aaa_8/master.m3u8', 6000);
    const before = await cartoonRepository.getCartoonByKinopoiskId('8');

    const expectedError = {
      errorKey: EXCEPTION_KEYS_ENUM.CARTOON_SOURCE_NOT_REPLACEABLE,
      message: expect.any(String),
      field: 'key',
    };

    const emptyResult = await handler.execute(
      new ReplaceCartoonSourceCommand({ kpId: '8', key: '', duration: 7200 }),
    );

    expect(emptyResult.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(emptyResult.errorField).toEqual(expectedError);

    const blankResult = await handler.execute(
      new ReplaceCartoonSourceCommand({ kpId: '8', key: '   ', duration: 7200 }),
    );

    expect(blankResult.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(blankResult.errorField).toEqual(expectedError);

    const nullResult = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '8',
        key: null as unknown as string,
        duration: 7200,
      }),
    );

    expect(nullResult.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(nullResult.errorField).toEqual(expectedError);

    const after = await cartoonRepository.getCartoonByKinopoiskId('8');
    expect(after?.videoUrl).toBe(before?.videoUrl);
    expect(after?.duration).toBe(before?.duration);
  });

  it('не обнуляет известную длительность, если duration пришёл нулевым или null', async () => {
    await publishCartoon('9', 'https://s3/cartoons/aaa_9/master.m3u8', 6000);

    const zeroResult = await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '9',
        key: 'https://s3/cartoons/bbb_9/master.m3u8',
        duration: 0,
      }),
    );

    expect(zeroResult.appResult).toBe(AppNotificationResultEnum.Success);

    const afterZero = await cartoonRepository.getCartoonByKinopoiskId('9');
    expect(afterZero?.videoUrl).toBe('https://s3/cartoons/bbb_9/master.m3u8');
    expect(afterZero?.duration).toBe(6000);

    await handler.execute(
      new ReplaceCartoonSourceCommand({
        kpId: '9',
        key: 'https://s3/cartoons/ccc_9/master.m3u8',
        duration: null,
      }),
    );

    const afterNull = await cartoonRepository.getCartoonByKinopoiskId('9');
    expect(afterNull?.videoUrl).toBe('https://s3/cartoons/ccc_9/master.m3u8');
    expect(afterNull?.duration).toBe(6000);
  });
});
