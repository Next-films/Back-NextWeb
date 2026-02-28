export class AdminAccessTokenPayload {
  id: number;
  iat: number;
  exp: number;
}

export class AdminRefreshTokenPayload {
  id: number;
  deviceId: string;
  iat: number;
  exp: number;
}

export class AdminLoginOutputDto {
  accessToken: string;
  refreshToken: string;
}
