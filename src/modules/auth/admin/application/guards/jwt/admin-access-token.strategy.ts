import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigurationType } from '@/settings/configuration';
import { ADMIN_ACCESS_TOKEN_GUARD_NAME } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';

@Injectable()
export class AdminAccessTokenStrategy extends PassportStrategy(
  Strategy,
  ADMIN_ACCESS_TOKEN_GUARD_NAME,
) {
  constructor(
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly adminAuthRepository: AdminAuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('apiSettings', { infer: true }).ADMIN_ACCESS_JWT_SECRET,
    });
  }

  async validate(payload: AdminAccessTokenPayload): Promise<AdminAccessTokenPayload | null> {
    const { id } = payload;
    const isExist = await this.adminAuthRepository.isExistAdmin(id);

    if (!isExist) return null;

    return payload;
  }
}
