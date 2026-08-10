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
import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { AdminExternalApiConfigController } from '@/admin/api/admin-external-api-config.controller';
import { AdminCreateExternalApiConfigCommandHandler } from '@/admin/application/handlers/admin-create-external-api-config.handler';
import { AdminUpdateExternalApiConfigCommandHandler } from '@/admin/application/handlers/admin-update-external-api-config.handler';
import { AdminRemoveExternalApiConfigCommandHandler } from '@/admin/application/handlers/admin-remove-external-api-config.handler';
import { AdminGetAllExternalApiConfigQueryHandler } from '@/admin/application/query-handlers/admin-get-all-external-api-config.query-handler';
import { AdminExternalApiConfigOutputDtoMapper } from '@/admin/api/dtos/output/admin-external-api-config.output.dto';
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
import { AdminCinemaSerialsOutputDtoMapper } from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';
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
import { AdminUpdateFilmCommandHandler } from '@/admin/application/handlers/admin-update-film.handler';
import { AdminRemoveFilmCommandHandler } from '@/admin/application/handlers/admin-remove-film.handler';
import { AdminApplyModerationMovieTaskCommandHandler } from '@/admin/application/handlers/admin-apply-moderation-movie-task.handler';
import { AdminCinemaPrivateController } from '@/admin/api/admin-cinema-private.controller';
import { AdminCinemaCartoonsController } from '@/admin/api/admin-cinema-cartoons.controller';
import { AdminGetAllCartoonsQueryHandler } from '@/admin/application/query-handlers/admin-get-all-cartoons.query-handler';
import { AdminUpdateCartoonCommandHandler } from '@/admin/application/handlers/admin-update-cartoon.handler';
import { AdminRemoveCartoonCommandHandler } from '@/admin/application/handlers/admin-remove-cartoon.handler';
import { AdminShowOrHiddeCartoonCommandHandler } from '@/admin/application/handlers/admin-show-or-hide-cartoon.handler';
import { AdminController } from '@/admin/api/admin.controller';
import { AdminRole } from '@/admin/domain/admin-role.entity';
import { AdminGetAllAdminRolesQueryHandler } from '@/admin/application/query-handlers/admin-get-all-admin-roles.query-handler';
import { AdminRolesOutputDtoMapper } from '@/admin/api/dtos/output/admin-roles.output.dto';
import { AdminRoleQueryRepository } from '@/admin/infrastructure/admin-role.query.repository';
import { AdminQueryRepository } from '@/admin/infrastructure/admin.query.repository';
import { AdminGetAllAdminsQueryHandler } from '@/admin/application/query-handlers/admin-get-all-admins.query-handler';
import { AdminGetAllAdminOutputDtoMapper } from '@/admin/api/dtos/output/admin-get-all-admins.output.dto';
import { AdminDeactivateAdminCommandHandler } from '@/admin/application/handlers/admin-deactivate-admin.handler';
import { AdminActivateAdminCommandHandler } from '@/admin/application/handlers/admin-activate-admin.handler';
import { AdminChangeAdminRoleCommandHandler } from '@/admin/application/handlers/admin-change-admin-role.handler';
import { AdminRoleRepository } from '@/admin/infrastructure/admin-role.repository';
import { AdminUpdateCommandHandler } from '@/admin/application/handlers/admin-update.handler';
import { AdminGetAdminByIdQueryHandler } from '@/admin/application/query-handlers/admin-get-admin-by-id.query-handler';
import { AdminUpdateAvatarCommandHandler } from '@/admin/application/handlers/admin-update-avatar.handler';
import { AdminGetFilmByIdQueryHandler } from '@/admin/application/query-handlers/admin-get-film-by-id.query-handler';
import { AdminGetCartoonByIdQueryHandler } from '@/admin/application/query-handlers/admin-get-cartoon-by-id.query-handler';
import { SerialModule } from '@/serials/serial.module';
import { AdminCinemaSerialsController } from '@/admin/api/admin-cinema-serials.controller';
import { AdminCinemaPremieresController } from '@/admin/api/admin-cinema-premieres.controller';
import { AdminGetAllSerialsQueryHandler } from '@/admin/application/query-handlers/admin-get-all-serials.query-handler';
import { AdminUpdateSerialCommandHandler } from '@/admin/application/handlers/admin-update-serial.handler';
import { AdminRemoveSerialCommandHandler } from '@/admin/application/handlers/admin-remove-serial.handler';
import { AdminShowOrHiddeSerialCommandHandler } from '@/admin/application/handlers/admin-show-or-hide-serial.handler';
import { AdminGetSerialByIdQueryHandler } from '@/admin/application/query-handlers/admin-get-serial-by-id.query-handler';
import { AdminMediaUrlSigningService } from '@/admin/application/services/admin-media-url-signing.service';
import { AdminRemoveAdminCommandHandler } from '@/admin/application/handlers/admin-remove-admin.handler';
import { AdminGetPremieresQueryHandler } from '@/admin/application/query-handlers/admin-get-premieres.query-handler';

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
  AdminCreateExternalApiConfigCommandHandler,
  AdminUpdateExternalApiConfigCommandHandler,
  AdminRemoveExternalApiConfigCommandHandler,
  AdminBanOrUnbanProviderMovieCommandHandler,
  AdminUpdateBannedProviderMovieCommandHandler,
  AdminShowOrHiddeFilmCommandHandler,
  AdminModerateRequestByTorrentCommandHandler,
  AdminAcceptModerationMovieTaskCommandHandler,
  AdminCancelModerationMovieTaskCommandHandler,
  AdminUpdateFilmCommandHandler,
  AdminRemoveFilmCommandHandler,
  AdminApplyModerationMovieTaskCommandHandler,
  AdminUpdateCartoonCommandHandler,
  AdminRemoveCartoonCommandHandler,
  AdminShowOrHiddeCartoonCommandHandler,
  AdminUpdateSerialCommandHandler,
  AdminRemoveSerialCommandHandler,
  AdminShowOrHiddeSerialCommandHandler,
  AdminDeactivateAdminCommandHandler,
  AdminActivateAdminCommandHandler,
  AdminChangeAdminRoleCommandHandler,
  AdminUpdateCommandHandler,
  AdminUpdateAvatarCommandHandler,
  AdminRemoveAdminCommandHandler,
];

const queryHandlers = [
  AdminGetAllExternalTokensQueryHandler,
  AdminGetAllExternalApiConfigQueryHandler,
  AdminGetAllBannedProvidersMoviesQueryHandler,
  AdminGetAllModerationMovieTaskQueryHandler,
  AdminGetModerationMovieTaskByIdQueryHandler,
  AdminGetAllFilmsQueryHandler,
  AdminGetAllCartoonsQueryHandler,
  AdminGetAllAdminRolesQueryHandler,
  AdminGetAllAdminsQueryHandler,
  AdminGetAdminByIdQueryHandler,
  AdminGetFilmByIdQueryHandler,
  AdminGetCartoonByIdQueryHandler,
  AdminGetAllSerialsQueryHandler,
  AdminGetSerialByIdQueryHandler,
  AdminGetPremieresQueryHandler,
];

const exportProviders = [
  TypeOrmModule.forFeature([Admin]),
  AdminProvider,
  AdminRepository,
  AdminRoleRepository,
];

@Module({
  imports: [
    MoviesModules,
    TypeOrmModule.forFeature([Admin, AdminTelegram, AdminRole]),
    BcryptModule,
    JwtModule,
    ExternalApiAuthModule,
    ExternalApiConfigModule,
    BandedProvidersMovieModule,
    FilmModule,
    CartoonModule,
    SerialModule,
    ModerationMovieModule,
  ],
  controllers: [
    AdminGenreController,
    AdminExternalApiController,
    AdminExternalApiConfigController,
    AdminCinemaRpcController,
    AdminBannedProvidersMovieController,
    AdminCinemaFilmsController,
    AdminModerationMovieController,
    AdminCinemaPrivateController,
    AdminCinemaCartoonsController,
    AdminCinemaSerialsController,
    AdminCinemaPremieresController,
    AdminController,
  ],
  providers: [
    ...handlers,
    GenerateAdminMigration,
    ...providers,
    ...queryHandlers,
    ExternalApiTokenOutputModelMapper,
    AdminExternalApiConfigOutputDtoMapper,
    AdminBannedProvidersMoviesOutputDtoMapper,
    AdminCinemaMoviesOutputDtoMapper,
    AdminCinemaFilmsOutputDtoMapper,
    AdminCinemaCartoonsOutputDtoMapper,
    AdminCinemaSerialsOutputDtoMapper,
    AdminRepository,
    AdminModerationMovieTaskOutputDtoMapper,
    AdminRolesOutputDtoMapper,
    AdminRoleQueryRepository,
    AdminQueryRepository,
    AdminGetAllAdminOutputDtoMapper,
    AdminRoleRepository,
    AdminMediaUrlSigningService,
  ],
  exports: [...exportProviders],
})
export class AdminModule {}
