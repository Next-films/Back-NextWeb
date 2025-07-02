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
import { AdminBannedProvidersMovieController } from '@/admin/api/admin-banned-providers-movie.controller';
import { AdminBanOrUnbanProviderMovieCommandHandler } from '@/admin/application/handlers/admin-ban-or-unban-provider-movie.handler';
import { BandedProvidersMovieModule } from '@/banned-providers-movie/banned-providers-movie.module';
import { AdminGetAllBannedProvidersMoviesQueryHandler } from '@/admin/application/query-handlers/admin-get-all-banned-providers-movies.query-handler';
import { AdminBannedProvidersMoviesOutputDtoMapper } from '@/admin/api/dtos/output/admin-banned-providers-movies.output.dto';
import { AdminUpdateBannedProviderMovieCommandHandler } from '@/admin/application/handlers/admin-update-banned-provider-movie.handler';
import { AdminCinemaFilmsController } from '@/admin/api/admin-cinema-films.controller';
import { AdminCinemaMoviesOutputDtoMapper } from '@/admin/api/dtos/output/admin-cinema-movies.output.dto';
import { AdminCinemaFilmsOutputDtoMapper } from '@/admin/api/dtos/output/admin-cinema-films.output.dto';
import { AdminCinemaCartoonsOutputDtoMapper } from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';
import { AdminShowOrHiddeFilmCommandHandler } from '@/admin/application/handlers/admin-show-or-hide-film.handler';
import { FilmModule } from '@/films/film.module';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { AdminModerateRequestByTorrentCommandHandler } from '@/admin/application/handlers/admin-moderate-movie-request-by-torrent.handler';
import { CartoonModule } from '@/cartoons/cartoon.module';
import { ModerationMovieModule } from '@/moderation-movie/moderation-movie.module';
import { AdminModerationMovieController } from '@/admin/api/admin-moderation-movie.controller';
import { AdminAcceptModerationMovieTaskCommandHandler } from '@/admin/application/handlers/admin-accept-moderation-movie-task.handler';
import { AdminGetAllModerationMovieTaskQueryHandler } from '@/admin/application/query-handlers/admin-get-all-moderation-movie-task.query-handler';
import { AdminModerationMovieTaskOutputDtoMapper } from '@/admin/api/dtos/output/admin-moderation-movie-task.output.dto';
import { AdminGetModerationMovieTaskByIdQueryHandler } from '@/admin/application/query-handlers/admin-get-moderation-movie-task-by-id.query-handler';
import { AdminCancelModerationMovieTaskCommandHandler } from '@/admin/application/handlers/admin-cancel-moderation-movie-task.handler';
import { AdminGetAllFilmsQueryHandler } from '@/admin/application/query-handlers/admin-get-all-films.query-handler';

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
  AdminBanOrUnbanProviderMovieCommandHandler,
  AdminUpdateBannedProviderMovieCommandHandler,
  AdminShowOrHiddeFilmCommandHandler,
  AdminModerateRequestByTorrentCommandHandler,
  AdminAcceptModerationMovieTaskCommandHandler,
  AdminCancelModerationMovieTaskCommandHandler,
];

const queryHandlers = [
  AdminGetAllExternalTokensQueryHandler,
  AdminGetAllBannedProvidersMoviesQueryHandler,
  AdminGetAllModerationMovieTaskQueryHandler,
  AdminGetModerationMovieTaskByIdQueryHandler,
  AdminGetAllFilmsQueryHandler,
];

const exportProviders = [TypeOrmModule.forFeature([Admin]), AdminProvider, AdminRepository];

@Module({
  imports: [
    MoviesModules,
    TypeOrmModule.forFeature([Admin, AdminTelegram]),
    BcryptModule,
    JwtModule,
    ExternalApiAuthModule,
    BandedProvidersMovieModule,
    FilmModule,
    CartoonModule,
    ModerationMovieModule,
  ],
  controllers: [
    AdminGenreController,
    AdminExternalApiController,
    AdminCinemaRpcController,
    AdminBannedProvidersMovieController,
    AdminCinemaFilmsController,
    AdminModerationMovieController,
  ],
  providers: [
    ...handlers,
    GenerateAdminMigration,
    ...providers,
    ...queryHandlers,
    ExternalApiTokenOutputModelMapper,
    AdminBannedProvidersMoviesOutputDtoMapper,
    AdminCinemaMoviesOutputDtoMapper,
    AdminCinemaFilmsOutputDtoMapper,
    AdminCinemaCartoonsOutputDtoMapper,
    AdminRepository,
    AdminModerationMovieTaskOutputDtoMapper,
  ],
  exports: [...exportProviders],
})
export class AdminModule {}
