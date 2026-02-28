import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRegisterInputModel } from '@/admin-auth/api/dtos/input/admin-register.input.model';

export const registerNewAdmin = async (
  app: INestApplication,
  uri: string,
  regData: AdminRegisterInputModel,
  accessToken: string,
): Promise<void> => {
  await request(app.getHttpServer())
    .post(uri)
    .send(regData)
    .set({ authorization: `Bearer ${accessToken}` })
    .expect(201);
};
