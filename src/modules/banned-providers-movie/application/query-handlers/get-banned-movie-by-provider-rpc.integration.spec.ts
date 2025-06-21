import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import {
  BanProviderMovieCommand,
  BanProviderMovieCommandHandler,
} from '@/banned-providers-movie/application/handlers/ban-provider-movie.handler';
import { BanProviderMoviePayloadDto } from '@/banned-providers-movie/domain/types';
import { TorApiProvidersEnum } from '@/common/types/types';
import { initTestSettings } from '../../../../test/test-init-settings';
import {
  GetBannedMovieByProviderRpcQuery,
  GetBannedMovieByProviderRpcQueryHandler,
} from '@/banned-providers-movie/application/query-handlers/get-banned-movie-by-provider-rpc.query-handler';

describe('GetBannedMovieByProviderRpcQueryHandler (integration)', () => {
  let app: INestApplication;
  let handler: BanProviderMovieCommandHandler;
  let handlerQuery: GetBannedMovieByProviderRpcQueryHandler;
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
    handlerQuery = app.get(GetBannedMovieByProviderRpcQueryHandler);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create new ban entity then get this ban entity', async () => {
    const result = await handler.execute(new BanProviderMovieCommand(banData));

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);

    const resultQuery = await handlerQuery.execute(
      new GetBannedMovieByProviderRpcQuery(banData.provider, banData.providerId),
    );

    expect(resultQuery.appResult).toBe(AppNotificationResultEnum.Success);
    expect(resultQuery.data).toEqual({
      id: expect.any(Number),
      providerId: banData.providerId,
      provider: banData.provider,
      createdAt: expect.any(Date),
    });
  });

  it('should not get ban entity, not found', async () => {
    const resultQuery = await handlerQuery.execute(
      new GetBannedMovieByProviderRpcQuery(banData.provider, banData.providerId),
    );

    expect(resultQuery.appResult).toBe(AppNotificationResultEnum.NotFound);
    expect(resultQuery.data).toBeNull();
  });
});
