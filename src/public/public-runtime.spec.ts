import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HttpService } from '@nestjs/axios';
import { PublicAppModule } from './public-app.module';
import { PublicConfigService, validatePublicEnvironment } from './public-config.service';
import {
  ExternalApiProviderEnum as Provider,
  ExternalApiTargetEnum as Target,
} from '@/external-api-config/domain/types';

describe('Isolated public runtime', () => {
  let app: INestApplication;
  const httpGet = jest.fn().mockResolvedValue({
    data: {
      results: [
        {
          id: 'serial-1',
          type: 'anime-serial',
          title: 'Anime',
          link: '//kodikplayer.com/serial/1/test/720p',
        },
      ],
    },
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PublicAppModule] })
      .overrideProvider(HttpService)
      .useValue({ axiosRef: { get: httpGet } })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('starts without any database, queue, downloader or internal backend', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ ok: true, role: 'public', internalConnections: false });
    await request(app.getHttpServer())
      .get('/api/playback-settings')
      .expect(200)
      .expect({ provider: 'vibix' });
    await request(app.getHttpServer()).get('/api/banners').expect(200).expect([]);
  });

  it('does not register admin, installer, sync, media signing or analytics write routes', async () => {
    for (const path of [
      '/admin/auth/login',
      '/cinema/bridge-rmq/films/download',
      '/cinema/media/sign-url',
      '/external-api/config/sync',
      '/analytics/event',
    ]) {
      await request(app.getHttpServer()).post(`/api${path}`).send({}).expect(404);
    }
    await request(app.getHttpServer()).get('/api/cinema/films').expect(404);
  });

  it('accepts the player host returned by the real Kodik API, but not lookalike hosts', async () => {
    const previousUrl = process.env.PUBLIC_KODIK_API_URL;
    const previousToken = process.env.PUBLIC_KODIK_API_TOKEN;
    process.env.PUBLIC_KODIK_API_URL = 'https://kodik-api.com';
    process.env.PUBLIC_KODIK_API_TOKEN = 'test-key';
    try {
      const response = await request(app.getHttpServer())
        .get('/api/kodik/catalog/anime')
        .expect(200);
      expect(response.body.items[0].player.iframeUrl).toBe(
        'https://kodikplayer.com/serial/1/test/720p',
      );
      httpGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 'serial-2',
              title: 'Bad host',
              link: 'https://kodikplayer.com.attacker.example/serial/2',
            },
          ],
        },
      });
      await request(app.getHttpServer()).get('/api/kodik/catalog/dramas').expect(502);
    } finally {
      if (previousUrl === undefined) delete process.env.PUBLIC_KODIK_API_URL;
      else process.env.PUBLIC_KODIK_API_URL = previousUrl;
      if (previousToken === undefined) delete process.env.PUBLIC_KODIK_API_TOKEN;
      else process.env.PUBLIC_KODIK_API_TOKEN = previousToken;
    }
  });

  it('only reads backend provider keys from its own environment', async () => {
    const config = new PublicConfigService({
      PUBLIC_VIBIX_API_URL: 'https://vibix.org/api/v1',
      PUBLIC_VIBIX_API_TOKEN: 'public-key',
    });
    expect((await config.getActiveConfig(Provider.VIBIX, Target.BACK))?.token).toBe('public-key');
    expect(await config.getActiveConfigs(Provider.VIBIX, Target.DOWNLOADER)).toEqual([]);
    expect(await config.getActiveConfigs(Provider.POSTMYPOST, Target.BACK)).toEqual([]);
    expect(await config.getActiveConfigs(Provider.VIDEOSEED, Target.BACK)).toEqual([]);
  });

  it('rejects an internal environment and non-provider endpoints at startup', () => {
    const valid = {
      APP_ROLE: 'public',
      PUBLIC_VIBIX_API_URL: 'https://vibix.org/api/v1',
      PUBLIC_VIBIX_API_TOKEN: 'key',
    };
    expect(() => validatePublicEnvironment(valid)).not.toThrow();
    for (const key of [
      'POSTGRES_HOST',
      'RMQ_URI',
      'DOWNLOAD_SERVICE_HTTP_URL',
      'SHORT_CONTENT_SERVICE_URL',
      'TELEGRAM_GATEWAY_URL',
    ]) {
      expect(() => validatePublicEnvironment({ ...valid, [key]: 'internal-service' })).toThrow(key);
    }
    expect(() => validatePublicEnvironment({ ...valid, IS_RMQ_ENABLE: 'true' })).toThrow('RMQ');
    expect(() =>
      validatePublicEnvironment({ ...valid, PUBLIC_VIBIX_API_URL: 'https://88.201.210.92' }),
    ).toThrow('host');
  });
});
