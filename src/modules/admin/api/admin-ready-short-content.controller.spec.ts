import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ShortContentClientService } from '../application/services/short-content-client.service';
import { ShortContentJobRepository } from '../infrastructure/short-content-job.repository';
import { ReadyShortContentService } from '../application/services/ready-short-content.service';
import { AdminShortContentController } from './admin-short-content.controller';

describe('Authenticated ready shelf route', () => {
  let app: INestApplication;
  const ready = {
    list: jest.fn().mockResolvedValue({ items: [], total: 0, counts: { library: 0, youtube: 0 } }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminShortContentController],
      providers: [
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
        { provide: ShortContentClientService, useValue: {} },
        { provide: ShortContentJobRepository, useValue: {} },
        { provide: ReadyShortContentService, useValue: ready },
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
  const endpoint = '/api/admin/cinema/short-content/ready';
  it('requires the admin guard and resolves the static route rather than :jobId', async () => {
    await request(app.getHttpServer()).get(endpoint).expect(403);
    expect(ready.list).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', 'Bearer test-admin')
      .expect(200);
    expect(ready.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 12, source: 'all', review: 'all' }),
    );
  });
  it.each([
    'page=0',
    'pageSize=51',
    'source=original',
    'review=unsafe',
    'search=' + 'x'.repeat(161),
    'path=/private',
  ])('validates %s before touching the worker', async query => {
    await request(app.getHttpServer())
      .get(`${endpoint}?${query}`)
      .set('Authorization', 'Bearer test-admin')
      .expect(400);
    expect(ready.list).not.toHaveBeenCalled();
  });
});
