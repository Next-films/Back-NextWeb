import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';
import { registerNewAdmin } from '../../../utils/auth/register-new-admin';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { AdminAuthSuiteContext } from '../admin-auth-suite-context';

export function registerAdminAuthLogoutSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseUri,
}: AdminAuthSuiteContext): void {
  describe('Admin auth => Logout', () => {
    it('Should register admin then should login by each admin then logout', async () => {
      const { accessToken, refreshToken } = await getLoginByMainAdmin()();

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

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGOUT}`)
        .set('Cookie', refreshTokenMain)
        .expect(201);

      request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGOUT}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      const resultAfterUpdateMain = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      const setCookieHeaderAfterUpdateMain = resultAfterUpdateMain.headers['set-cookie'];
      const refreshTokenAfterUpdateMain = Array.isArray(setCookieHeaderAfterUpdateMain)
        ? setCookieHeaderAfterUpdateMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderAfterUpdateMain?.split(';')[0];

      expect(refreshTokenAfterUpdateMain).toBeUndefined();

      // Update token by main admin
      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshToken)
        .expect(201);
    });
  });
}
