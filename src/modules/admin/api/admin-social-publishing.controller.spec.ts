import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { AdminSocialPublishingController } from './admin-social-publishing.controller';
import { SocialPublishingService } from '../application/services/social-publishing.service';

describe('Publishing group input and admin authorization', () => {
  let app: INestApplication;
  const service = {
    createRule: jest.fn().mockResolvedValue({ id: 7 }),
    updateRule: jest.fn().mockResolvedValue({ id: 7 }),
    enqueueYoutube: jest.fn().mockResolvedValue({ id: 'a'.repeat(64) }),
    listYoutubeClips: jest.fn().mockResolvedValue([]),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminSocialPublishingController],
      providers: [{ provide: SocialPublishingService, useValue: service }],
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
  afterAll(async () => app.close());
  afterEach(() => jest.clearAllMocks());
  const path = '/api/admin/cinema/short-content/publishing';
  const auth = { Authorization: 'Bearer test-admin' };
  const base = {
    name: 'Правило',
    provider: 'postmypost',
    projectId: 11,
    accountIds: [13],
    intervalMinutes: 60,
    startAt: '2030-01-01T10:00:00Z',
  };

  it('blocks unauthenticated group enrollment and listing', async () => {
    await request(app.getHttpServer())
      .get(path + '/youtube-clips')
      .expect(403);
    await request(app.getHttpServer())
      .post(path + '/youtube-clips/abcdefghijk')
      .send({ revision: 1, reviewConfirmed: true })
      .expect(403);
    expect(service.enqueueYoutube).not.toHaveBeenCalled();
  });

  it('accepts both groups with a bounded ratio and rejects invalid policies before service calls', async () => {
    await request(app.getHttpServer())
      .post(path + '/rules')
      .set(auth)
      .send({
        ...base,
        sourceGroups: ['own', 'youtube'],
        groupStrategy: 'ratio',
        ownPerCycle: 2,
        youtubePerCycle: 1,
        fallbackToOtherGroup: true,
      })
      .expect(201);
    expect(service.createRule).toHaveBeenCalledWith(
      expect.objectContaining({ ownPerCycle: 2, sourceGroups: ['own', 'youtube'] }),
    );
    for (const patch of [
      { sourceGroups: [] },
      { sourceGroups: ['own', 'own'] },
      { sourceGroups: ['other'] },
      { sourceGroups: null },
      { ownPerCycle: 0 },
      { youtubePerCycle: 21 },
      { youtubePerCycle: null },
      { groupStrategy: 'random' },
      { firstGroup: 'other' },
      { fallbackToOtherGroup: 'true' },
    ]) {
      service.createRule.mockClear();
      await request(app.getHttpServer())
        .post(path + '/rules')
        .set(auth)
        .send({ ...base, ...patch })
        .expect(400);
      expect(service.createRule).not.toHaveBeenCalled();
      await request(app.getHttpServer())
        .patch(path + '/rules/7')
        .set(auth)
        .send(patch)
        .expect(400);
    }
  });
});
