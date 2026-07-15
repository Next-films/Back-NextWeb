import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import * as request from 'supertest';
import { TEST_ADMIN_LOGIN_DATA, TEST_ADMIN_REG_DATA } from '../../../data/admin-auth.test.data';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminAuthSuiteContext } from '../admin-auth-suite-context';

export function registerAdminAuthRegistrationSuite({
  getApp,
  getLoginByMainAdmin,
  getBaseUri,
}: AdminAuthSuiteContext): void {
  describe('Admin auth => Registration', () => {
    it('Should register new admin', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(201);

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.LOGIN}`)
        .send(TEST_ADMIN_LOGIN_DATA)
        .expect(201);
    });

    it('Should not register new admin, bad input data', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
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
          {
            message: expect.any(String),
            field: 'telegramId',
            errorKey: EXCEPTION_KEYS_ENUM.telegramId,
          },
        ],
      });

      const resultWithEmail = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
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

      const resultWithPassword = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
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

      const resultWithUserName = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
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

      const resultWithTgId1 = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, telegramId: '    ' })
        .expect(400);

      expect(resultWithTgId1.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'telegramId',
            errorKey: EXCEPTION_KEYS_ENUM.telegramId,
          },
        ],
      });

      const resultWithTgId2 = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({
          ...TEST_ADMIN_REG_DATA,
          telegramId:
            'rjkfrjbhjfrbhjfrbhjfrbhjrfbhjfrhjfrbhjfrbhjfrbhjbfrhjbfrhjhjrfbhjfrbhjfrbhjfrbhjfrbhjfrbhjbhjrf',
        })
        .expect(400);

      expect(resultWithTgId2.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'telegramId',
            errorKey: EXCEPTION_KEYS_ENUM.telegramId,
          },
        ],
      });

      //Not correct pattern password
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '123456789' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '*****&&!&!&£^$' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'админПароль' })
          .expect(400),
      ]);
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLLLLLLLL' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'LLLaaaa' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: '&&&QYWE' })
          .expect(400),
      ]);
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, password: 'Pa$' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({
            ...TEST_ADMIN_LOGIN_DATA,
            password: 'PASsswordPassWordPASsswordPassWord123456&&&&&&',
          })
          .expect(400),
      ]);

      //Not correct pattern email

      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email.ru' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'почта@mail.ru' })
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@mail.ruuuuuu' })
          .expect(400),
      ]);
      await Promise.all([
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'emаil@mail.ru' }) // Russian 'A'
          .expect(400),
        request(getApp().getHttpServer())
          .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
          .set({ authorization: `Bearer ${accessToken}` })
          .send({ ...TEST_ADMIN_LOGIN_DATA, email: 'email@почта.ru' })
          .expect(400),
      ]);
    });

    it('Should not register new admin, unauthorized', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer accessToken` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(401);

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(201);
    });

    it('Should not register new admin, email and username already exist, telegram id already exist', async () => {
      const { accessToken } = await getLoginByMainAdmin()();

      await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send(TEST_ADMIN_REG_DATA)
        .expect(201);

      const result = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
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
          {
            message: expect.any(String),
            field: 'telegramId',
            errorKey: EXCEPTION_KEYS_ENUM.TELEGRAM_ID_IS_EXIST,
          },
        ],
      });

      const resultWithEmail = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, username: 'other_username', telegramId: '128343444' })
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

      const resultWithUsername = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, email: 'other@mail.ru', telegramId: '128343444' })
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

      const resultWithTgId = await request(getApp().getHttpServer())
        .post(`${getBaseUri()}/${ADMIN_AUTH_ROUTES.REGISTRATION}`)
        .set({ authorization: `Bearer ${accessToken}` })
        .send({ ...TEST_ADMIN_REG_DATA, email: 'other@mail.ru', username: 'other_username284' })
        .expect(400);

      expect(resultWithTgId.body).toEqual({
        message: expect.any(String),
        statusCode: 400,
        errorField: [
          {
            message: expect.any(String),
            field: 'telegramId',
            errorKey: EXCEPTION_KEYS_ENUM.TELEGRAM_ID_IS_EXIST,
          },
        ],
      });
    });
  });
}
