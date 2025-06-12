import { Module } from '@nestjs/common';
import { ExternalApiAuthRepository } from '@/external-auth/infrastructure/external-api-auth.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalApiAuth } from '@/external-auth/domain/external-api-auth.entity';
import { ExternalApiAuthQueryRepository } from '@/external-auth/infrastructure/external-api-auth.query-repository';
import { ExternalApiTokenCheckOutputModelMapper } from '@/external-auth/api/dtos/output/external-api-token-check.output.dto';
import { ExternalApiAuthController } from '@/external-auth/api/external-api-auth.controller';
import { ApiCinemaCheckAccessTokenStrategy } from '@/external-auth/application/guards/jwt/api-cinema-check-token.strategy';
import { ApiCinemaAccessTokenStrategy } from '@/external-auth/application/guards/jwt/api-cinema-access-token.strategy';
import { GenerateExternalTokenMigration } from '@/data-migrations/generate-external-token.migration';

export const AdminExternalApiProvider = {
  provide: 'ExternalApiAuth',
  useValue: ExternalApiAuth,
};

const exportProviders = [
  ExternalApiAuthRepository,
  TypeOrmModule.forFeature([ExternalApiAuth]),
  ExternalApiAuthQueryRepository,
  AdminExternalApiProvider,
];

const providers = [AdminExternalApiProvider];

const guards = [ApiCinemaCheckAccessTokenStrategy, ApiCinemaAccessTokenStrategy];

@Module({
  imports: [TypeOrmModule.forFeature([ExternalApiAuth])],
  controllers: [ExternalApiAuthController],
  providers: [
    ExternalApiAuthRepository,
    ExternalApiAuthQueryRepository,
    ...providers,
    ExternalApiTokenCheckOutputModelMapper,
    ...guards,
    GenerateExternalTokenMigration,
  ],
  exports: [...exportProviders],
})
export class ExternalApiAuthModule {}
