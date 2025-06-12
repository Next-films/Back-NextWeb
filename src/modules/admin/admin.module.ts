import { Module } from '@nestjs/common';
import { AdminGenreController } from '@/admin/api/admin-genre.controller';
import { AdminGenreCreateCommandHandler } from '@/admin/application/handlers/admin-genre-create.handler';
import { MoviesModules } from '@/movies/movies.modules';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { BcryptModule } from '@/bcrypt-module/bcrypt.module';
import { AdminCreateExternalApiTokenCommandHandler } from '@/admin/application/handlers/admin-create-external-api-token.handler';
import { JwtModule } from '@/jwt-module/jwt.module';
import { ExternalApiAuthModule } from '@/external-auth/external-api-auth.module';
import { AdminExternalApiController } from '@/admin/api/admin-external-api.controller';
import { AdminGetAllExternalTokensQueryHandler } from '@/admin/application/query-handlers/admin-get-all-external-tokens.query-handler';
import { ExternalApiTokenOutputModelMapper } from '@/admin/api/dtos/output/external-api-tokens.output.dto';
import { AdminUpdateExternalApiTokenCommandHandler } from '@/admin/application/handlers/admin-update-external-api-token.handler';
import { AdminRemoveExternalApiTokenCommandHandler } from '@/admin/application/handlers/admin-remove-external-api-token.handler';
import { AdminCinemaRpcController } from '@/admin/api/admin-cinema-rpc.controller';

export const AdminProvider = {
  provide: 'Admin',
  useValue: Admin,
};

const providers = [AdminProvider];

const handlers = [
  AdminGenreCreateCommandHandler,
  AdminCreateExternalApiTokenCommandHandler,
  AdminUpdateExternalApiTokenCommandHandler,
  AdminRemoveExternalApiTokenCommandHandler,
];
const queryHandlers = [AdminGetAllExternalTokensQueryHandler];

const exportProviders = [TypeOrmModule.forFeature([Admin]), AdminProvider];

@Module({
  imports: [
    MoviesModules,
    TypeOrmModule.forFeature([Admin]),
    BcryptModule,
    JwtModule,
    ExternalApiAuthModule,
  ],
  controllers: [AdminGenreController, AdminExternalApiController, AdminCinemaRpcController],
  providers: [
    ...handlers,
    GenerateAdminMigration,
    ...providers,
    ...queryHandlers,
    ExternalApiTokenOutputModelMapper,
  ],
  exports: [...exportProviders],
})
export class AdminModule {}
