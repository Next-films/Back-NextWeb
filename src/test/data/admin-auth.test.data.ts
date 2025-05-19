import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminRegisterInputModel } from '@/admin-auth/api/dtos/input/admin-register.input.model';

export const TEST_ADMIN_REG_DATA: AdminRegisterInputModel = {
  password: 'Password123456&',
  email: 'test@test.com',
  username: 'adminka',
};

export const TEST_ADMIN_LOGIN_DATA: AdminLoginInputModel = {
  password: TEST_ADMIN_REG_DATA.password,
  email: TEST_ADMIN_REG_DATA.email,
};
