import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';
import { registerNewAdmin } from '../../../utils/auth/register-new-admin';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminAuthSuiteContext } from '../admin-auth-suite-context';

export function registerAdminAuthLoginSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseUri,
  getMainAdminLoginData,
}: AdminAuthSuiteContext): void {
  describe('Admin auth => Login', () => {
    it('Should login by main admin', async () => {
      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(getMainAdminLoginData())
        .expect(201);

      expect(result.body).toEqual({
        accessToken: expect.any(String),
        isPasswordSet: expect.any(Boolean),
      });

      const setCookieHeader = result.headers['set-cookie'];
      const refreshToken = Array.isArray(setCookieHeader)
        ? setCookieHeader
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeader?.split(';')[0];

      expect(refreshToken).not.toBe('');
      expect(refreshToken).toBeDefined();
    });

    it('Main admin register new admin. New admin should login', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);

      const accessTokenNewAdmin = result.body.accessToken;

      expect(typeof accessTokenNewAdmin).toBe('string');

      const setCookieHeaderMain = result.headers['set-cookie'];
      const refreshTokenMain = Array.isArray(setCookieHeaderMain)
        ? setCookieHeaderMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderMain?.split(';')[0];

      expect(refreshTokenMain).not.toBe('');
      expect(refreshTokenMain).toBeDefined();
    });

    it('Should register new admin, and should not login by new admin, incorrect password', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'otherPassword123&' })
        .expect(401);

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);
    });

    it('Should register new admin, and should not login by new admin, incorrect email', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'other@mail.ru' })
        .expect(401);

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);
    });

    it('Should register new admin, and should not login by new admin, incorrect input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const regUri = `${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(getApp(), regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({})
        .expect(400);

      expect(result.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'email',
            errorKey: EXCEPTION_KEYS_ENUM.email,
          },
          {
            message: expect.any(String),
            field: 'password',
            errorKey: EXCEPTION_KEYS_ENUM.password,
          },
        ],
      });

      const resultWithEmail = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({ ...TEST_ADMIN_LOGIN_DATA, email: '   ' })
        .expect(400);

      expect(resultWithEmail.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'email',
            errorKey: EXCEPTION_KEYS_ENUM.email,
          },
        ],
      });

      const resultWithPassword = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({ ...TEST_ADMIN_LOGIN_DATA, password: '   ' })
        .expect(400);

      expect(resultWithPassword.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'password',
            errorKey: EXCEPTION_KEYS_ENUM.password,
          },
        ],
      });

      //Not correct pattern password
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '123456789' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '*****&&!&!&£^$' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'админПароль' })
          .expect(400),
      ]);
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLLLLLLLL' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLaaaa' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '&&&QYWE' })
          .expect(400),
      ]);
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'Pa$' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({
            ...TEST_ADMIN_LOGIN_DATA,
            password: 'PASsswordPassWordPASsswordPassWord123456&&&&&&',
          })
          .expect(400),
      ]);

      //Not correct pattern email

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email.ru' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'почта@mail.ru' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@mail.ruuuuuu' })
          .expect(400),
      ]);
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'emаil@mail.ru' }) // Russian 'A'
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@почта.ru' })
          .expect(400),
      ]);
    });
  });
}
