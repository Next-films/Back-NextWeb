import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';
import { AdminMeOutputModelMapper } from '@/admin-auth/api/dtos/output/admin-me.output.model';
import { JwtModule } from '@/jwt-module/jwt.module';
import { AdminLoginHandler } from '@/admin-auth/application/handlers/admin-login.handler';
import { AdminLogoutHandler } from '@/admin-auth/application/handlers/admin-logout.handler';
import { AdminModule } from '@/admin/admin.module';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { BcryptModule } from '@/bcrypt-module/bcrypt.module';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { AdminAuthController } from '@/admin-auth/api/admin-auth.controller';
import { AdminAccessTokenStrategy } from '@/admin-auth/application/guards/jwt/admin-access-token.strategy';
import { AdminMeAccessTokenStrategy } from '@/admin-auth/application/guards/jwt/admin-me-access-token.strategy';
import { AdminJwtRefreshTokenStrategy } from '@/admin-auth/application/guards/jwt/admin-refresh-token.strategy';
import { AdminRegisterHandler } from '@/admin-auth/application/handlers/admin-register.handler';
import { AdminUpdateTokensHandler } from '@/admin-auth/application/handlers/admin-update-tokens.handler';

export const AdminSessionProvider = {
  provide: 'AdminSession',
  useValue: AdminSession,
};

const providers = [AdminSessionProvider];

const handlers = [
  AdminLoginHandler,
  AdminLogoutHandler,
  AdminRegisterHandler,
  AdminUpdateTokensHandler,
];

const guards = [AdminAccessTokenStrategy, AdminMeAccessTokenStrategy, AdminJwtRefreshTokenStrategy];

@Module({
  imports: [TypeOrmModule.forFeature([AdminSession]), JwtModule, AdminModule, BcryptModule],
  controllers: [AdminAuthController],
  providers: [
    AdminMeOutputModelMapper,
    AdminAuthRepository,
    AdminAuthSessionRepository,
    ...providers,
    ...handlers,
    ...guards,
  ],
  exports: [],
})
export class AdminAuthModule {}
