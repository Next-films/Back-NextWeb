import { INestApplication } from '@nestjs/common';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { TestService } from '../../../../test/test.service';
import { initTestSettings } from '../../../../test/test-init-settings';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import {
  AdminModerateRequestByTorrentCommand,
  AdminModerateRequestByTorrentCommandHandler,
} from '@/admin/application/handlers/admin-moderate-movie-request-by-torrent.handler';
import { ModerateRequestPayloadDto } from '@/admin/api/dtos/input/admin-moderate-movie.input.dto';
import { MovieTypesEnum } from '@/common/types/types';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { TelegramAdminBotSendNotificationNewModerationMovieCommandHandler } from '@/telegram/admin-bot/application/handlers/bot-send-notification-new-moderation-movie.handler';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { Film } from '@/films/domain/film.entity';
import { MovieHandleStatus } from '@/movies/domain/types';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';

const moderateFilmRequestData: ModerateRequestPayloadDto = {
  kpId: '12345',
  type: MovieTypesEnum.FILM,
  torrent: {
    RuTor: [
      {
        Id: '999',
        Url: 'https://url.com',
        Name: 'Name',
        Hash: 'hash',
        Magnet: 'magnet',
        Torrent: 'torrent',
        Poster: 'poster',
        Files: [
          {
            Name: 'file',
            Size: '10GB',
          },
        ],
      },
    ],
    Kinozal: null,
    NoNameClub: null,
    RuTracker: [
      {
        Id: '938465',
        Url: 'https://url.com',
        Name: 'Name 2',
        Hash: 'hash',
        Magnet: 'magnet',
        Torrent: 'torrent',
        Poster: 'poster',
        Files: [
          {
            Name: 'file',
            Size: '10GB',
          },
        ],
      },
    ],
  },
  movieName: 'Movie',
};

const moderateCartoonRequestData: ModerateRequestPayloadDto = {
  kpId: '3722844',
  type: MovieTypesEnum.CARTOON,
  torrent: {
    RuTor: [
      {
        Id: '57449304',
        Url: 'https://url.com',
        Name: 'Cartoon 1',
        Hash: 'hash',
        Magnet: 'magnet',
        Torrent: 'torrent',
        Poster: 'poster',
        Files: [
          {
            Name: 'file',
            Size: '10GB',
          },
        ],
      },
    ],
    Kinozal: null,
    NoNameClub: null,
    RuTracker: [
      {
        Id: '546565463',
        Url: 'https://url.com',
        Name: 'Cartoon 2',
        Hash: 'hash',
        Magnet: 'magnet',
        Torrent: 'torrent',
        Poster: 'poster',
        Files: [
          {
            Name: 'file',
            Size: '10GB',
          },
        ],
      },
    ],
  },
  movieName: 'Movie',
};

describe('AdminModerateRequestByTorrentCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: AdminModerateRequestByTorrentCommandHandler;
  let filmRepository: FilmRepository;
  let cartoonRepository: CartoonRepository;
  let testService: TestService;
  let moderationFilmRepository: ModerationFilmRepository;
  let moderationCartoonRepository: ModerationCartoonRepository;
  let finishedTorrentModerationRepository: FinishedTorrentModerationRepository;
  let generateAdminMigration: GenerateAdminMigration;
  let telegramAdminBotSendNotificationNewModerationMovieCommandHandler: TelegramAdminBotSendNotificationNewModerationMovieCommandHandler;

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(AdminModerateRequestByTorrentCommandHandler);
    filmRepository = app.get(FilmRepository);
    moderationFilmRepository = app.get(ModerationFilmRepository);
    moderationCartoonRepository = app.get(ModerationCartoonRepository);
    generateAdminMigration = app.get(GenerateAdminMigration);
    cartoonRepository = app.get(CartoonRepository);
    finishedTorrentModerationRepository = app.get(FinishedTorrentModerationRepository);
    telegramAdminBotSendNotificationNewModerationMovieCommandHandler = app.get(
      TelegramAdminBotSendNotificationNewModerationMovieCommandHandler,
    );
  });

  beforeEach(async () => {
    await testService.clearDb();
    await generateAdminMigration.onModuleInit();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create moderation task', async () => {
    const telegramAdminBotSendNotificationNewModerationMovieCommandHandlerSpy = jest.spyOn(
      telegramAdminBotSendNotificationNewModerationMovieCommandHandler,
      'execute',
    );

    try {
      const resultFilm = await handler.execute(
        new AdminModerateRequestByTorrentCommand(moderateFilmRequestData),
      );

      const resultCartoon = await handler.execute(
        new AdminModerateRequestByTorrentCommand(moderateCartoonRequestData),
      );

      expect(resultFilm.appResult).toBe(AppNotificationResultEnum.Success);
      expect(resultCartoon.appResult).toBe(AppNotificationResultEnum.Success);
      expect(
        telegramAdminBotSendNotificationNewModerationMovieCommandHandlerSpy,
      ).toHaveBeenCalledTimes(2);
    } finally {
      telegramAdminBotSendNotificationNewModerationMovieCommandHandlerSpy.mockRestore();
    }

    const [moderateFilmTask, moderateCartoonTask] = await Promise.all([
      moderationFilmRepository.getAllModeration(),
      moderationCartoonRepository.getAllModeration(),
    ]);

    expect(moderateFilmTask).toHaveLength(1);
    expect(moderateCartoonTask).toHaveLength(1);

    const taskFilm = moderateFilmTask[0];
    const taskCartoon = moderateCartoonTask[0];

    expect(taskFilm.adminId).toBeNull();
    expect(taskFilm.movieId).toBeDefined();
    expect(taskFilm.createdAt).toEqual(expect.any(Date));
    expect(taskFilm.acceptAt).toBeNull();
    expect(taskFilm.torrentData).toEqual(moderateFilmRequestData.torrent);

    expect(taskCartoon.adminId).toBeNull();
    expect(taskCartoon.movieId).toBeDefined();
    expect(taskCartoon.createdAt).toEqual(expect.any(Date));
    expect(taskCartoon.acceptAt).toBeNull();
    expect(taskCartoon.torrentData).toEqual(moderateCartoonRequestData.torrent);

    const film = await filmRepository.getFilmById(taskFilm.movieId);
    const cartoon = await cartoonRepository.getCartoonById(taskCartoon.movieId);

    expect(film).toBeDefined();
    expect(film?.isHidden).toBeTruthy();
    expect(film?.handleStatus).toBe(MovieHandleStatus.MODERATE);

    expect(cartoon).toBeDefined();
    expect(cartoon?.isHidden).toBeTruthy();
    expect(cartoon?.handleStatus).toBe(MovieHandleStatus.MODERATE);
  });

  it('should return error if movie already moderated by torrent', async () => {
    await Promise.all([
      finishedTorrentModerationRepository.save(
        FinishedTorrentModerationEntity.create(1, moderateFilmRequestData.kpId),
      ),
      finishedTorrentModerationRepository.save(
        FinishedTorrentModerationEntity.create(1, moderateCartoonRequestData.kpId),
      ),
    ]);

    const [resultFilm, resultCartoon] = await Promise.all([
      handler.execute(new AdminModerateRequestByTorrentCommand(moderateFilmRequestData)),
      handler.execute(new AdminModerateRequestByTorrentCommand(moderateCartoonRequestData)),
    ]);

    expect(resultFilm.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(resultCartoon.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(resultFilm.errorField?.errorKey).toBe(
      EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_MODERATED_BY_TORRENT,
    );
    expect(resultCartoon.errorField?.errorKey).toBe(
      EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_MODERATED_BY_TORRENT,
    );
  });

  it('should return error if movie already exists in database with production state', async () => {
    await Promise.all([
      filmRepository.save(
        Film.create({
          name: 'Film',
          handleStatus: MovieHandleStatus.PRODUCTION,
          hidden: false,
          kpId: moderateFilmRequestData.kpId,
          key: 'https://key.com',
          originalName: 'Original name',
          duration: 1000,
          description: 'desc',
          releaseDate: '2024.07.01',
          alternativeName: 'alt name',
          trailerUrl: 'https://video.com',
          backgroundContentUrl: 'https://video.com',
          titleUrl: 'https://video.com',
          previewUrl: 'https://video.com',
          country: ['Russia'],
          genres: null,
        }),
      ),
      cartoonRepository.save(
        Cartoon.create({
          name: 'Cartoon',
          handleStatus: MovieHandleStatus.PRODUCTION,
          hidden: false,
          kpId: moderateCartoonRequestData.kpId,
          key: 'https://key.com',
          originalName: 'Original name',
          duration: 1000,
          description: 'desc',
          releaseDate: '2024.07.01',
          alternativeName: 'alt name',
          trailerUrl: 'https://video.com',
          backgroundContentUrl: 'https://video.com',
          titleUrl: 'https://video.com',
          previewUrl: 'https://video.com',
          country: ['Russia'],
          genres: null,
        }),
      ),
    ]);

    const [resultFilm, resultCartoon] = await Promise.all([
      handler.execute(new AdminModerateRequestByTorrentCommand(moderateFilmRequestData)),
      handler.execute(new AdminModerateRequestByTorrentCommand(moderateCartoonRequestData)),
    ]);

    expect(resultFilm.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(resultFilm.errorField?.errorKey).toBe(EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_EXIST);

    expect(resultCartoon.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(resultCartoon.errorField?.errorKey).toBe(EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_EXIST);
  });

  it('should return error if movie already exists in database with moderation state', async () => {
    await Promise.all([
      filmRepository.save(
        Film.create({
          name: 'Film',
          handleStatus: MovieHandleStatus.MODERATE,
          hidden: true,
          kpId: moderateFilmRequestData.kpId,
          key: null,
          originalName: null,
          duration: 0,
          description: null,
          releaseDate: null,
          alternativeName: null,
          trailerUrl: null,
          backgroundContentUrl: null,
          titleUrl: null,
          previewUrl: null,
          country: null,
          genres: null,
        }),
      ),
      cartoonRepository.save(
        Cartoon.create({
          name: 'Cartoon',
          handleStatus: MovieHandleStatus.MODERATE,
          hidden: true,
          kpId: moderateCartoonRequestData.kpId,
          key: null,
          originalName: null,
          duration: 0,
          description: null,
          releaseDate: null,
          alternativeName: null,
          trailerUrl: null,
          backgroundContentUrl: null,
          titleUrl: null,
          previewUrl: null,
          country: null,
          genres: null,
        }),
      ),
    ]);

    const [resultFilm, resultCartoon] = await Promise.all([
      handler.execute(new AdminModerateRequestByTorrentCommand(moderateFilmRequestData)),
      handler.execute(new AdminModerateRequestByTorrentCommand(moderateCartoonRequestData)),
    ]);

    expect(resultFilm.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(resultFilm.errorField?.errorKey).toBe(EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_EXIST);

    expect(resultCartoon.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(resultCartoon.errorField?.errorKey).toBe(EXCEPTION_KEYS_ENUM.MOVIE_ALREADY_EXIST);
  });

  it('should return error for invalid movie type', async () => {
    const invalidData = {
      ...moderateFilmRequestData,
      type: 'INVALID_TYPE' as MovieTypesEnum,
    };

    const result = await handler.execute(new AdminModerateRequestByTorrentCommand(invalidData));

    expect(result.appResult).toBe(AppNotificationResultEnum.BadRequest);
    expect(result.errorField?.errorKey).toBe(EXCEPTION_KEYS_ENUM.INCORRECT_MOVIE_TYPE);
  });

  it('should handle database errors gracefully', async () => {
    jest.spyOn(filmRepository, 'save').mockRejectedValue(new Error('DB Error'));

    const result = await handler.execute(
      new AdminModerateRequestByTorrentCommand(moderateFilmRequestData),
    );

    expect(result.appResult).toBe(AppNotificationResultEnum.InternalError);
  });
});
