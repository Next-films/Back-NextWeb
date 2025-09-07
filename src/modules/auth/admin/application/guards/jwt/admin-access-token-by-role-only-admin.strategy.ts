import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigurationType } from '@/settings/configuration';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { ADMIN_ACCESS_TOKEN_BY_ROLE_ONLY_ADMIN_GUARD_NAME } from '@/admin-auth/application/guards/jwt/admin-access-token-by-role-only-admin.guard';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

@Injectable()
export class AdminAccessTokenByRoleOnlyAdminStrategy extends PassportStrategy(
  Strategy,
  ADMIN_ACCESS_TOKEN_BY_ROLE_ONLY_ADMIN_GUARD_NAME,
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
    const admin = await this.adminAuthRepository.getAdminById(id);

    if (!admin) return null;
    if (!admin.isActive) return null;
    if (!admin.roles.some(role => role.name === AdminRoleEnum.ADMIN)) return null;

    return payload;
  }
}
