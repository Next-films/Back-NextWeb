import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { AdminYoutubeMonitorController } from './admin-youtube-monitor.controller';
import { YoutubeMonitorService } from '../application/services/youtube-monitor.service';
import { YoutubeProcessingService } from '../application/services/youtube-processing.service';

describe('Authenticated admin YouTube routes', () => {
  let app: INestApplication;
  const monitor = {
    overview: jest.fn().mockResolvedValue({ videos: [] }),
    saveAccounts: jest.fn().mockResolvedValue({ accounts: [] }),
    startSync: jest.fn().mockReturnValue({ running: true }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminYoutubeMonitorController],
      providers: [
        { provide: YoutubeMonitorService, useValue: monitor },
        {
          provide: YoutubeProcessingService,
          useValue: { status: jest.fn(), download: jest.fn(), render: jest.fn(), asset: jest.fn() },
        },
      ],
    })
      .overrideGuard(AdminAccessTokenGuard)
      .useValue({
        canActivate: context =>
          context.switchToHttp().getRequest().headers.authorization === 'Bearer test-admin',
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks unauthenticated reads, edits and sync starts', async () => {
    await request(app.getHttpServer()).get('/api/admin/cinema/youtube').expect(403);
    await request(app.getHttpServer())
      .put('/api/admin/cinema/youtube/accounts')
      .send({ accounts: [] })
      .expect(403);
    await request(app.getHttpServer()).post('/api/admin/cinema/youtube/sync').expect(403);
    expect(monitor.overview).not.toHaveBeenCalled();
    expect(monitor.startSync).not.toHaveBeenCalled();
    for (const route of ['import', 'render'])
      await request(app.getHttpServer())
        .post(`/api/admin/cinema/youtube/videos/LOP8ul3KqQI/${route}`)
        .send({})
        .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin/cinema/youtube/videos/LOP8ul3KqQI/files/original')
      .expect(403);
  });

  it('returns quickly for manual sync and validates the list and pagination before service calls', async () => {
    const auth = { Authorization: 'Bearer test-admin' };
    await request(app.getHttpServer())
      .get('/api/admin/cinema/youtube?page=2&pageSize=12')
      .set(auth)
      .expect(200);
    expect(monitor.overview).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 12 }),
    );
    await request(app.getHttpServer()).post('/api/admin/cinema/youtube/sync').set(auth).expect(202);
    await request(app.getHttpServer())
      .put('/api/admin/cinema/youtube/accounts')
      .set(auth)
      .send({ accounts: ['@channel'] })
      .expect(200);
    expect(monitor.saveAccounts).toHaveBeenCalledWith(['@channel']);
    monitor.saveAccounts.mockClear();
    for (const body of [
      { accounts: 'not-an-array' },
      { accounts: [1] },
      { accounts: new Array(21).fill('@channel') },
      { accounts: [], apiKey: 'not-supported' },
    ]) {
      await request(app.getHttpServer())
        .put('/api/admin/cinema/youtube/accounts')
        .set(auth)
        .send(body)
        .expect(400);
    }
    for (const query of ['page=0', 'page=NaN', 'pageSize=1000']) {
      await request(app.getHttpServer())
        .get(`/api/admin/cinema/youtube?${query}`)
        .set(auth)
        .expect(400);
    }
    expect(monitor.saveAccounts).not.toHaveBeenCalled();
  });
});
