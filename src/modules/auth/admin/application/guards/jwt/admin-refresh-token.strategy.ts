import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigurationType } from '@/settings/configuration';
import { ADMIN_REFRESH_TOKEN_GUARD_NAME } from '@/admin-auth/application/guards/jwt/admin-refresh-token.guard';
import { AdminRefreshTokenPayload } from '@/admin-auth/domain/types';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';

@Injectable()
export class AdminJwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  ADMIN_REFRESH_TOKEN_GUARD_NAME,
) {
  constructor(
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly adminRepository: AdminAuthRepository,
    private readonly adminSessionRepository: AdminAuthSessionRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request?.cookies?.[COOKIE_REFRESH_TOKEN_NAME];

          if (!token) throw new UnauthorizedException('Refresh token not found');

          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('apiSettings', { infer: true }).ADMIN_REFRESH_JWT_SECRET,
    });
  }

  async validate(payload: AdminRefreshTokenPayload): Promise<AdminRefreshTokenPayload | null> {
    const { id, deviceId, iat } = payload;

    const [admin, authSession] = await Promise.all([
      this.adminRepository.getAdminById(id),
      this.adminSessionRepository.getSessionByDeviceId(deviceId),
    ]);

    if (!admin || !authSession) return null;
    if (authSession.adminId !== id) return null;
    if (authSession.issueAt.toISOString() !== new Date(iat * 1000).toISOString()) return null;

    return payload;
  }
}
