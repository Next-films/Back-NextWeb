import { INestApplication } from '@nestjs/common';
import { TestService } from '../../test.service';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { initTestSettings } from '../../test-init-settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import { adminLogin } from '../../utils/auth/admin-login';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import * as request from 'supertest';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';
import { registerNewAdmin } from '../../utils/auth/register-new-admin';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../data/admin-auth.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';

describe('Admin auth', () => {
  let app: INestApplication;
  let testService: TestService;
  let baseUri: string;
  const mainAdminLoginData: AdminLoginInputModel = {
    email: '',
    password: '',
  };
  let adminAuthSessionRepository: AdminAuthSessionRepository;
  let loginByMainAdmin: () => Promise<AdminLoginOutputDto>;

  beforeAll(async () => {
    const createApp = await initTestSettings();

    app = createApp.app;
    testService = createApp.testService;
    const appUri = createApp.baseUri;

    const apiSettings = app
      .get(ConfigService<ConfigurationType, true>)
      .get('apiSettings', { infer: true });

    mainAdminLoginData.email = apiSettings.ADMIN_EMAIL;
    mainAdminLoginData.password = apiSettings.ADMIN_PASSWORD;
    adminAuthSessionRepository = app.get(AdminAuthSessionRepository);

    baseUri = appUri + ADMIN_AUTH_ROUTES.MAIN;

    loginByMainAdmin = () =>
      adminLogin(app, `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`, mainAdminLoginData);
  });

  beforeEach(async () => {
    await testService.clearDb();

    const migrationService = app.get<GenerateAdminMigration>(GenerateAdminMigration);
    await migrationService.onModuleInit();
  });

  describe('Admin auth => Login', () => {
    it('Should login by main admin', async () => {
      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(mainAdminLoginData)
        .expect(201);

      expect(result.body).toEqual({
        accessToken: expect.any(String),
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
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
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
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'otherPassword123&' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);
    });

    it('Should register new admin, and should not login by new admin, incorrect email', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'other@mail.ru' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);
    });

    it('Should register new admin, and should not login by new admin, incorrect input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
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

      const resultWithEmail = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
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

      const resultWithPassword = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
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
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '123456789' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '*****&&!&!&£^$' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'админПароль' })
          .expect(400),
      ]);
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLLLLLLLL' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLaaaa' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '&&&QYWE' })
          .expect(400),
      ]);
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'Pa$' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({
            ...TEST_ADMIN_LOGIN_DATA,
            password: 'PASsswordPassWordPASsswordPassWord123456&&&&&&',
          })
          .expect(400),
      ]);

      //Not correct pattern email

      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email.ru' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'почта@mail.ru' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@mail.ruuuuuu' })
          .expect(400),
      ]);
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'emаil@mail.ru' }) // Russian 'A'
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@почта.ru' })
          .expect(400),
      ]);
    });
  });

  describe('Admin auth => Registration', () => {
    it('Should register new admin', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(201);

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);
    });

    it('Should not register new admin, bad input data', async () => {
      const { accessToken } = await loginByMainAdmin();

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
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
          {
            message: expect.any(String),
            field: 'username',
            errorKey: EXCEPTION_KEYS_ENUM.username,
          },
        ],
      });

      const resultWithEmail = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, email: '   ' })
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

      const resultWithPassword = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, password: '   ' })
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

      const resultWithUserName = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, username: '    ' })
        .expect(400);

      expect(resultWithUserName.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'username',
            errorKey: EXCEPTION_KEYS_ENUM.username,
          },
        ],
      });

      //Not correct pattern password
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '123456789' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '*****&&!&!&£^$' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'админПароль' })
          .expect(400),
      ]);
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLLLLLLLL' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLaaaa' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '&&&QYWE' })
          .expect(400),
      ]);
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'Pa$' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({
            ...TEST_ADMIN_LOGIN_DATA,
            password: 'PASsswordPassWordPASsswordPassWord123456&&&&&&',
          })
          .expect(400),
      ]);

      //Not correct pattern email

      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email.ru' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'почта@mail.ru' })
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@mail.ruuuuuu' })
          .expect(400),
      ]);
      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'emаil@mail.ru' }) // Russian 'A'
          .expect(400),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@почта.ru' })
          .expect(400),
      ]);
    });

    it('Should not register new admin, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer accessToken` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(401);

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(201);
    });

    it('Should not register new admin, email and username already exist', async () => {
      const { accessToken } = await loginByMainAdmin();

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(201);

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(400);

      expect(result.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'email',
            errorKey: EXCEPTION_KEYS_ENUM.EMAIL_IS_EXIST,
          },
          {
            message: expect.any(String),
            field: 'username',
            errorKey: EXCEPTION_KEYS_ENUM.USERNAME_IS_EXIST,
          },
        ],
      });

      const resultWithEmail = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, username: 'other_username' })
        .expect(400);

      expect(resultWithEmail.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'email',
            errorKey: EXCEPTION_KEYS_ENUM.EMAIL_IS_EXIST,
          },
        ],
      });

      const resultWithUsername = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, email: 'other@mail.ru' })
        .expect(400);

      expect(resultWithUsername.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'username',
            errorKey: EXCEPTION_KEYS_ENUM.USERNAME_IS_EXIST,
          },
        ],
      });
    });
  });

  describe('Admin auth => Logout', () => {
    it('Should register admin then should login by each admin then logout', async () => {
      const { accessToken, refreshToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;
      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);

      const setCookieHeaderMain = result.headers['set-cookie'];

      const refreshTokenMain = Array.isArray(setCookieHeaderMain)
        ? setCookieHeaderMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderMain?.split(';')[0];

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGOUT}`)
        .set('Cookie', refreshTokenMain)
        .expect(201);

      request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGOUT}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      const resultAfterUpdateMain = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
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
      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshToken)
        .expect(201);
    });
  });

  describe('Admin auth => Update tokens', () => {
    it('Should register 3 admin should login by each admin then update tokens', async () => {
      const { accessToken, refreshToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await Promise.all([
        registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken),
        registerNewAdmin(
          app,
          regUri,
          { ...TEST_ADMIN_REG_DATA, email: 'second@mail.ru', username: 'secondname' },
          accessToken,
        ),
        registerNewAdmin(
          app,
          regUri,
          { ...TEST_ADMIN_REG_DATA, email: 'second2@mail.ru', username: 'secondname2' },
          accessToken,
        ),
      ]);

      const [result1, result2, result3] = await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send(TEST_ADMIN_LOGIN_DATA)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'second@mail.ru' })
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'second2@mail.ru' })
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
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken1)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken2)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken3)
          .expect(201),
      ]);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken1)
          .expect(401),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken2)
          .expect(401),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
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
      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshToken)
        .expect(201);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshTokenAfterUpdate1)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshTokenAfterUpdate2)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshTokenAfterUpdate3)
          .expect(201),
      ]);
    });

    it('Should not update tokens, refresh token not found', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await Promise.all([
        registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken),
        registerNewAdmin(
          app,
          regUri,
          { ...TEST_ADMIN_REG_DATA, email: 'second@mail.ru', username: 'secondname' },
          accessToken,
        ),
        registerNewAdmin(
          app,
          regUri,
          { ...TEST_ADMIN_REG_DATA, email: 'second2@mail.ru', username: 'secondname2' },
          accessToken,
        ),
      ]);

      const [result1, result2, result3] = await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send(TEST_ADMIN_LOGIN_DATA)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'second@mail.ru' })
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'second2@mail.ru' })
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
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', 'accessToken=accessToken')
          .expect(401),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', 'accessToken=accessToken')
          .expect(401),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', 'accessToken=accessToken')
          .expect(401),
      ]);

      await Promise.all([
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken1)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken2)
          .expect(201),
        request(app.getHttpServer())
          .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
          .set('Cookie', refreshToken3)
          .expect(201),
      ]);
    });

    it('A pair of tokens should not be updated, the user in Payload is incorrect', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);

      const setCookieHeaderMain = result.headers['set-cookie'];

      const refreshTokenMain = Array.isArray(setCookieHeaderMain)
        ? setCookieHeaderMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderMain?.split(';')[0];

      await testService.delay(1000);

      const refreshRepoSpy = jest
        .spyOn(adminAuthSessionRepository, 'getSessionByDeviceId')
        .mockImplementation(async () => {
          return AdminSession.create(3, 'deviceId-2', new Date(), new Date());
        });

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      refreshRepoSpy.mockRestore();
    });

    it('A pair of tokens should not be updated, issue date is incorrect', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      const result = await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);

      const setCookieHeaderMain = result.headers['set-cookie'];

      const refreshTokenMain = Array.isArray(setCookieHeaderMain)
        ? setCookieHeaderMain
            .find(cookie => cookie.startsWith(`${COOKIE_REFRESH_TOKEN_NAME}=`))
            ?.split(';')[0]
        : setCookieHeaderMain?.split(';')[0];

      await testService.delay(1000);

      const refreshRepoSpy = jest
        .spyOn(adminAuthSessionRepository, 'getSessionByDeviceId')
        .mockImplementation(async () => {
          return AdminSession.create(2, 'deviceId-2', new Date(), new Date());
        });

      await request(app.getHttpServer())
        .post(`${baseUri}/${ADMIN_AUTH_ROUTES.UPDATE_TOKENS}`)
        .set('Cookie', refreshTokenMain)
        .expect(401);

      refreshRepoSpy.mockRestore();
    });
  });

  describe('Admin auth => Me', () => {
    it('Register new admin then admin should get info about current user', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;
      const logUri = `${baseUri}/${ADMIN_AUTH_ROUTES.LOGIN}`;

      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);
      const { accessToken: accessTokenSecond } = await adminLogin(
        app,
        logUri,
        TEST_ADMIN_LOGIN_DATA,
      );

      const resultMe = await request(app.getHttpServer())
        .get(`${baseUri}/${ADMIN_AUTH_ROUTES.ME}`)
        .set({ authorization: `Bearer ${accessTokenSecond}` })
        .expect(200);

      expect(resultMe.body.id).toBeDefined();
    });

    it('Register new admin then admin should not get info about user, unauthorized', async () => {
      const { accessToken } = await loginByMainAdmin();

      const regUri = `${baseUri}/${ADMIN_AUTH_ROUTES.REGISTRATION}`;
      await registerNewAdmin(app, regUri, TEST_ADMIN_REG_DATA, accessToken);

      await request(app.getHttpServer())
        .get(`${baseUri}/${ADMIN_AUTH_ROUTES.ME}`)
        .set({ authorization: `Bearer accessToken` })
        .expect(401);
    });
  });
});
