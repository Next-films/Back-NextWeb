import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import { adminLogin } from '../../../utils/auth/admin-login';
import * as request from 'supertest';
import { registerNewAdmin } from '../../../utils/auth/register-new-admin';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { AdminAuthSuiteContext } from '../admin-auth-suite-context';

export function registerAdminAuthMeSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseUri,
}: AdminAuthSuiteContext): void {
  describe('Admin auth => Me', () => {
    it('Register new admin then admin should get info about current user', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;
      const logUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);
      const { accessToken: accessTokenSecond } = await adminLogin(
        getApp(),
        logUri,
        TEST_ADMIN_LOGIN_DATA,
      );

      const resultMe = await request(getApp().getHttpServer())
        .get(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.ME}`)
        .set({ authorization: `Bearer ${accessTokenSecond}` })
        .expect(200);

      expect(resultMe.body.id).toBeDefined();
    });

    it('Register new admin then admin should not get info about user, unauthorized', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;
      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      await request(getApp().getHttpServer())
        .get(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.ME}`)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);
    });
  });
}
