import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';
import { registerNewAdmin } from '../../../utils/auth/register-new-admin';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';
import { AdminAuthSuiteContext } from '../admin-auth-suite-context';

export function registerAdminAuthUpdateTokensSuite({
  getApp,
  getTestService,
  getLoginByMainAdmin,
  getBaseUri,
  getAdminAuthSessionRepository,
}: AdminAuthSuiteContext): void {
  describe('Admin auth => Update tokens', () => {
    it('Should register 3 admin should login by each admin then update tokens', async () => {
      const { accessToken, refreshToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await Promise.all([
        registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken),
        registerNewAdmin(
          getApp(),
          regUri,
          {
            ...TEST_ADMIN_REG_DATA,
            username: 'secondname',
            telegramUsername: 'secondname_tg',
          },
          accessToken,
        ),
        registerNewAdmin(
          getApp(),
          regUri,
          {
            ...TEST_ADMIN_REG_DATA,
            username: 'secondname2',
            telegramUsername: 'secondname2_tg',
          },
          accessToken,
        ),
      ]);

      const [result1, result2, result3] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send(TEST_ADMIN_LOGIN_DATA)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, login: 'secondname' })
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, login: 'secondname2' })
          .expect(201),
      ]);

      const setCookieHeader1 = result1.headers['set-cookie'];
      const setCookieHeader2 = result2.headers['set-cookie'];
      const setCookieHeader3 = result3.headers['set-cookie'];

      const refreshToken1 = Array.isArray(setCookieHeader1)
        ? setCookieHeader1
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader1?.split(';')[0];
      const refreshToken2 = Array.isArray(setCookieHeader2)
        ? setCookieHeader2
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader2?.split(';')[0];
      const refreshToken3 = Array.isArray(setCookieHeader3)
        ? setCookieHeader3
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader3?.split(';')[0];

      const [resultAfterUpdate1, resultAfterUpdate2, resultAfterUpdate3] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken1)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken2)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken3)
          .expect(201),
      ]);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken1)
          .expect(401),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken2)
          .expect(401),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken3)
          .expect(401),
      ]);

      const setCookieHeaderAfterUpdate1 = resultAfterUpdate1.headers['set-cookie'];
      const refreshTokenAfterUpdate1 = Array.isArray(setCookieHeaderAfterUpdate1)
        ? setCookieHeaderAfterUpdate1
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderAfterUpdate1?.split(';')[0];

      const setCookieHeaderAfterUpdate2 = resultAfterUpdate2.headers['set-cookie'];
      const refreshTokenAfterUpdate2 = Array.isArray(setCookieHeaderAfterUpdate2)
        ? setCookieHeaderAfterUpdate2
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderAfterUpdate2?.split(';')[0];

      const setCookieHeaderAfterUpdate3 = resultAfterUpdate3.headers['set-cookie'];
      const refreshTokenAfterUpdate3 = Array.isArray(setCookieHeaderAfterUpdate3)
        ? setCookieHeaderAfterUpdate3
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderAfterUpdate3?.split(';')[0];

      const accessTokenAfterUpdate1 = resultAfterUpdate1.body.accessToken;
      const accessTokenAfterUpdate2 = resultAfterUpdate2.body.accessToken;
      const accessTokenAfterUpdate3 = resultAfterUpdate3.body.accessToken;

      expect(refreshTokenAfterUpdate1).toBeDefined();
      expect(refreshTokenAfterUpdate2).toBeDefined();
      expect(refreshTokenAfterUpdate3).toBeDefined();

      expect(accessTokenAfterUpdate1).toBeDefined();
      expect(accessTokenAfterUpdate2).toBeDefined();
      expect(accessTokenAfterUpdate3).toBeDefined();

      expect(accessTokenAfterUpdate1).not.toBe(refreshToken);
      expect(accessTokenAfterUpdate1).not.toBe(accessTokenAfterUpdate2);
      expect(accessTokenAfterUpdate1).not.toBe(accessTokenAfterUpdate3);

      expect(accessTokenAfterUpdate2).not.toBe(refreshToken2);
      expect(accessTokenAfterUpdate2).not.toBe(refreshToken);

      expect(refreshTokenAfterUpdate3).not.toBe(refreshToken);

      // Update token by main admin
      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshToken)
        .expect(201);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshTokenAfterUpdate1)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshTokenAfterUpdate2)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshTokenAfterUpdate3)
          .expect(201),
      ]);
    });

    it('Should not update tokens, refresh token not found', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await Promise.all([
        registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken),
        registerNewAdmin(
          getApp(),
          regUri,
          {
            ...TEST_ADMIN_REG_DATA,
            username: 'secondname',
            telegramUsername: 'secondname_tg',
          },
          accessToken,
        ),
        registerNewAdmin(
          getApp(),
          regUri,
          {
            ...TEST_ADMIN_REG_DATA,
            username: 'secondname2',
            telegramUsername: 'secondname2_tg',
          },
          accessToken,
        ),
      ]);

      const [result1, result2, result3] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send(TEST_ADMIN_LOGIN_DATA)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, login: 'secondname' })
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, login: 'secondname2' })
          .expect(201),
      ]);

      const setCookieHeader1 = result1.headers['set-cookie'];
      const setCookieHeader2 = result2.headers['set-cookie'];
      const setCookieHeader3 = result3.headers['set-cookie'];

      const refreshToken1 = Array.isArray(setCookieHeader1)
        ? setCookieHeader1
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader1?.split(';')[0];
      const refreshToken2 = Array.isArray(setCookieHeader2)
        ? setCookieHeader2
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader2?.split(';')[0];
      const refreshToken3 = Array.isArray(setCookieHeader3)
        ? setCookieHeader3
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader3?.split(';')[0];

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', 'accessToken=accessToken')
          .expect(401),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', 'accessToken=accessToken')
          .expect(401),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', 'accessToken=accessToken')
          .expect(401),
      ]);

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken1)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken2)
          .expect(201),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken3)
          .expect(201),
      ]);
    });

    it('A pair of tokens should not be updated, the user in Payload is incorrect', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);

      const setCookieHeaderMain = result.headers['set-cookie'];

      const refreshTokenMain = Array.isArray(setCookieHeaderMain)
        ? setCookieHeaderMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderMain?.split(';')[0];

      await getTestService().delay(1000);

      const refreshRepoSpy = jest
        .spyOn(getAdminAuthSessionRepository(), 'getSessionByDeviceId')
        // eslint-disable-next-line @typescript-eslint/require-await
        .mockImplementation(async () => {
          return AdminSession.create(3, 'deviceId-2', new Date(), new Date());
        });

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      refreshRepoSpy.mockRestore();
    });

    it('A pair of tokens should not be updated, issue date is incorrect', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);

      const setCookieHeaderMain = result.headers['set-cookie'];

      const refreshTokenMain = Array.isArray(setCookieHeaderMain)
        ? setCookieHeaderMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderMain?.split(';')[0];

      await getTestService().delay(1000);

      const refreshRepoSpy = jest
        .spyOn(getAdminAuthSessionRepository(), 'getSessionByDeviceId')
        // eslint-disable-next-line @typescript-eslint/require-await
        .mockImplementation(async () => {
          return AdminSession.create(2, 'deviceId-2', new Date(), new Date());
        });

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      refreshRepoSpy.mockRestore();
    });
  });
}
