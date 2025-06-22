import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import {
  BanProviderMovieCommand,
  BanProviderMovieCommandHandler,
} from '@/banned-providers-movie/application/handlers/ban-provider-movie.handler';
import { TorApiProvidersEnum } from '@/common/types/types';
import { BannedProvidersMovieQueryRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.query-repository';
import { initTestSettings } from '../../../../test/test-init-settings';
import { BanProviderMoviePayloadDto } from '@/banned-providers-movie/api/dtos/input/ban-provider-movie-rpc.input.dto';

describe('BanProviderMovieCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: BanProviderMovieCommandHandler;
  let bannedProvidersMovieQueryRepository: BannedProvidersMovieQueryRepository;
  let testService: TestService;

  const banData: BanProviderMoviePayloadDto = {
    movieName: 'movie',
    providerId: '12345',
    provider: TorApiProvidersEnum.KINOZAL,
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(BanProviderMovieCommandHandler);
    bannedProvidersMovieQueryRepository = app.get(BannedProvidersMovieQueryRepository);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create new ban entity', async () => {
    const result = await handler.execute(new BanProviderMovieCommand(banData));

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);

    const ban = await bannedProvidersMovieQueryRepository.getBannedMoviesByFilter(
      0,
      10,
      null,
      null,
      null,
    );

    expect(ban).toBeDefined();
    expect(ban).toHaveLength(1);
    expect(ban![0]?.providerId).toBe(banData.providerId);
    expect(ban![0]?.provider).toBe(banData.provider);
    expect(ban![0]?.movieName).toBe(banData.movieName);
  });

  it('should not create new ban entity, ban already exist', async () => {
    const result = await handler.execute(new BanProviderMovieCommand(banData));

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);

    const ban = await bannedProvidersMovieQueryRepository.getBannedMoviesByFilter(
      0,
      10,
      null,
      null,
      null,
    );

    expect(ban).toBeDefined();
    expect(ban).toHaveLength(1);
    expect(ban![0]?.providerId).toBe(banData.providerId);
    expect(ban![0]?.provider).toBe(banData.provider);
    expect(ban![0]?.movieName).toBe(banData.movieName);

    const result2 = await handler.execute(
      new BanProviderMovieCommand({ ...banData, movieName: 'qqq' }),
    );

    expect(result2.appResult).toBe(AppNotificationResultEnum.Success);

    const ban2 = await bannedProvidersMovieQueryRepository.getBannedMoviesByFilter(
      0,
      10,
      null,
      null,
      null,
    );

    expect(ban2).toBeDefined();
    expect(ban2).toHaveLength(1);
  });
});
