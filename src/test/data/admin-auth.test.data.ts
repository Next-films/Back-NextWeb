import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { AdminRegisterInputModel } from '@/admin-auth/api/dtos/input/admin-register.input.model';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export const TEST_ADMIN_PASSWORD = 'Password123456&';

export const TEST_ADMIN_REG_DATA: AdminRegisterInputModel = {
  username: 'adminka',
  telegramUsername: 'adminka_tg',
  roles: [AdminRoleEnum.ADMIN],
};

export const TEST_ADMIN_LOGIN_DATA: AdminLoginInputModel = {
  login: TEST_ADMIN_REG_DATA.username,
  password: TEST_ADMIN_PASSWORD,
};
