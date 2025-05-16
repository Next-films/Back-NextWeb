import { CookieOptions } from 'express';

export const COOKIE_REFRESH_TOKEN_NAME = 'refreshToken';
export const COOKIE_REFRESH_BASIC_OPTIONS: CookieOptions = {
  sameSite: 'none',
  httpOnly: true,
  secure: true,
  maxAge: 24 * 60 * 60 * 1000,
};

export const COOKIE_REFRESH_TOKEN_ADMIN_OPTIONS: CookieOptions = {
  ...COOKIE_REFRESH_BASIC_OPTIONS,
};
