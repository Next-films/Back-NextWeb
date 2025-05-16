import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigurationType } from '@/settings/configuration';
import { ADMIN_ME_ACCESS_TOKEN_GUARD_NAME } from '@/admin-auth/application/guards/jwt/admin-me-access-token.guard';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import {
  AdminMeOutputModel,
  AdminMeOutputModelMapper,
} from '@/admin-auth/api/dtos/output/admin-me.output.model';

@Injectable()
export class AdminMeAccessTokenStrategy extends PassportStrategy(
  Strategy,
  ADMIN_ME_ACCESS_TOKEN_GUARD_NAME,
) {
  constructor(
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly adminRepository: AdminAuthRepository,
    private readonly adminMeOutputModelMapper: AdminMeOutputModelMapper,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('apiSettings', { infer: true }).ADMIN_ACCESS_JWT_SECRET,
    });
  }

  async validate(payload: AdminAccessTokenPayload): Promise<AdminMeOutputModel | null> {
    const { id } = payload;
    const admin = await this.adminRepository.getAdminById(id);

    if (!admin) return null;

    return this.adminMeOutputModelMapper.mapAdmin(admin);
  }
}
