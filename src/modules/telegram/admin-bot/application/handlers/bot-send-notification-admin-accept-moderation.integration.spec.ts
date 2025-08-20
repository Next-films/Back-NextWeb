import { INestApplication } from '@nestjs/common';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { TestService } from '../../../../../test/test.service';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { initTestSettings } from '../../../../../test/test-init-settings';
import { MovieCreateDto, MovieHandleStatus } from '@/movies/domain/types';
import { FindTorApiTorrentFilmType, MovieTypesEnum } from '@/common/types/types';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import {
  TelegramAdminBotSendNotificationAdminAcceptModerationCommand,
  TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler,
} from './bot-send-notification-admin-accept-moderation.handler';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import {
  BotAdminAcceptModerationPayloadDto,
  BotSendMessagePayloadDto,
} from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';

describe('TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler;
  let filmRepository: FilmRepository;
  let cartoonRepository: CartoonRepository;
  let testService: TestService;
  let moderationFilmRepository: ModerationFilmRepository;
  let moderationCartoonRepository: ModerationCartoonRepository;
  let generateAdminMigration: GenerateAdminMigration;
  let telegramAdminBotService: TelegramAdminBotService;
  let adminRepository: AdminRepository;

  let main_telegram_group_chat_id: string;
  let new_film_telegram_thread_id: string;
  let admin_tg_username: string;

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(TelegramAdminBotSendNotificationAdminAcceptModerationCommandHandler);
    filmRepository = app.get(FilmRepository);
    moderationFilmRepository = app.get(ModerationFilmRepository);
    moderationCartoonRepository = app.get(ModerationCartoonRepository);
    generateAdminMigration = app.get(GenerateAdminMigration);
    cartoonRepository = app.get(CartoonRepository);
    telegramAdminBotService = app.get(TelegramAdminBotService);
    adminRepository = app.get(AdminRepository);
    const configService = app.get(ConfigService<ConfigurationType, true>);
    const apiSettings = configService.get('apiSettings', { infer: true });

    main_telegram_group_chat_id = apiSettings.MAIN_TELEGRAM_GROUP_CHAT_ID;
    new_film_telegram_thread_id = apiSettings.NEW_FILM_TELEGRAM_THREAD_ID;
    admin_tg_username = apiSettings.ADMIN_TG_USERNAME;
  });

  beforeEach(async () => {
    await testService.clearDb();
    await generateAdminMigration.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  const createTask = async (
    type: MovieTypesEnum,
    movieId: number,
    torrentData?: FindTorApiTorrentFilmType,
  ): Promise<void> => {
    const data: CreateModerationDto = {
      movieId,
    };

    if (torrentData) {
      data.torrentMetaData = torrentData;
    }

    const admin = await adminRepository.getAdminById(1);
    if (!admin) {
      throw new Error('Admin not found (ERROR IN TEST)');
    }

    data.admin = admin;

    switch (type) {
      case MovieTypesEnum.FILM: {
        const moderationFilmEntity = ModerationFilmEntity.create<ModerationFilmEntity>(data);
        await moderationFilmRepository.save(moderationFilmEntity);
        return;
      }
      case MovieTypesEnum.CARTOON: {
        const moderationCartoonEntity =
          ModerationCartoonEntity.create<ModerationCartoonEntity>(data);
        await moderationCartoonRepository.save(moderationCartoonEntity);
        return;
      }
    }
  };

  const createMovie = async (
    type: MovieTypesEnum,
    kpId: string,
    movieName: string,
    hidden: boolean,
  ): Promise<number | null> => {
    const movieData: MovieCreateDto = {
      kpId,
      key: 'key',
      name: movieName,
      hidden,
      titleUrl: null,
      previewUrl: null,
      trailerUrl: null,
      backgroundContentUrl: null,
      genres: null,
      releaseDate: null,
      description: null,
      country: null,
      duration: 0,
      alternativeName: null,
      originalName: null,
      handleStatus: MovieHandleStatus.PROCESSING,
    };

    switch (type) {
      case MovieTypesEnum.FILM: {
        const film = Film.create(movieData);
        const result = await filmRepository.save(film);
        return result.id;
      }

      case MovieTypesEnum.CARTOON: {
        const cartoon = Cartoon.create(movieData);
        const result = await cartoonRepository.save(cartoon);

        return result.id;
      }

      default: {
        return null;
      }
    }
  };

  const createMovieAndTasks = async (
    count: number,
    type: MovieTypesEnum,
    hidden = true,
    torrentData?: FindTorApiTorrentFilmType,
  ) => {
    for (let i = 0; i < count; i++) {
      const movie = await createMovie(type, `${type}-${i + 1}`, `Movie ${i}`, hidden);

      if (!movie) {
        console.warn('Movie not created into tests');
        continue;
      }

      await createTask(type, movie, torrentData);
    }
  };

  it('should send notification about accept moderation task', async () => {
    await createMovieAndTasks(1, MovieTypesEnum.FILM);
    await createMovieAndTasks(1, MovieTypesEnum.CARTOON);

    const expectedPayload: BotSendMessagePayloadDto = {
      chatId: Number(main_telegram_group_chat_id),
      threadId: Number(new_film_telegram_thread_id),
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.MOVIE_MODERATION_ACCEPTED_BY_ADMIN,
    };

    const expectedData1: BotAdminAcceptModerationPayloadDto = {
      movieId: 1,
      title: `Movie 0`,
      telegramUsername: admin_tg_username,
      acceptAt: expect.any(String),
      type: telegramAdminBotService.getMovieTypeString(MovieTypesEnum.FILM),
    };

    const expectedData2: BotAdminAcceptModerationPayloadDto = {
      movieId: 1,
      title: `Movie 0`,
      telegramUsername: admin_tg_username,
      acceptAt: expect.any(String),
      type: telegramAdminBotService.getMovieTypeString(MovieTypesEnum.CARTOON),
    };

    const telegramAdminBotServiceSpy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');
    await handler.execute(
      new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(MovieTypesEnum.FILM, 1),
    );
    await handler.execute(
      new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(MovieTypesEnum.CARTOON, 1),
    );
    try {
      expect(telegramAdminBotServiceSpy).toHaveBeenCalledTimes(2);

      expect(telegramAdminBotServiceSpy).toHaveBeenNthCalledWith(
        1,
        expectedPayload,
        expect.objectContaining(expectedData1),
      );

      expect(telegramAdminBotServiceSpy).toHaveBeenNthCalledWith(
        2,
        expectedPayload,
        expect.objectContaining(expectedData2),
      );
    } finally {
      telegramAdminBotServiceSpy.mockRestore();
    }
  });

  it('should not send notification if moderation not found', async () => {
    const spy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

    try {
      await handler.execute(
        new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(MovieTypesEnum.FILM, 999),
      );

      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('should not send notification if movie type is unsupported', async () => {
    const spy = jest.spyOn(telegramAdminBotService, 'sendHtmlMessage');

    try {
      await handler.execute(
        new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(
          'type' as MovieTypesEnum,
          1,
        ),
      );

      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('should log error if botService throws', async () => {
    await createMovieAndTasks(1, MovieTypesEnum.FILM);

    jest.spyOn(telegramAdminBotService, 'sendHtmlMessage').mockRejectedValue(new Error('fail'));

    await expect(
      handler.execute(
        new TelegramAdminBotSendNotificationAdminAcceptModerationCommand(MovieTypesEnum.FILM, 1),
      ),
    ).resolves.not.toThrow();
  });
});
