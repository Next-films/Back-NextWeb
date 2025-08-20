import { Module } from '@nestjs/common';
import { PublicFilmController } from '@/films/api/public-film.controller';
import { GetPublicFilmByIdQueryHandler } from '@/films/application/query-handlers/get-public-film-by-id.query-handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Film } from '@/films/domain/film.entity';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { FilmsPublicOutputDtoMapper } from '@/films/api/dtos/output/films-public.output.dto';
import { GetPublicFilmsQueryHandler } from '@/films/application/query-handlers/get-public-films.query-handler';
import { GetPrivateFilmByKinopoiskIdQueryHandler } from '@/films/application/query-handlers/get-private-film-by-kinopoisk-id.query-handler';
import { FilmPrivateController } from '@/films/api/private-film.controller';
import { FilmPrivateRpcController } from '@/films/api/private-film-rpc.controller';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { NewFilmNotificationCommandHandler } from '@/films/application/handlers/new-film-notification.handler';
import { MoviesModules } from '@/movies/movies.modules';
import { KinopoiskModule } from '@/external-api/kinopoisk/kinopoisk.module';
import { FilmBridgeRmqController } from '@/films/api/bridge-rpc-film.controller';
import { NewFilmIsHandleNotificationCommandHandler } from '@/films/application/handlers/new-film-is-handle-notification.handler';
import { FilmsRpcOutputDtoMapper } from '@/films/api/dtos/output/films-rpc.output.dto';
import { GetRpcFilmByKinopoiskIdQueryHandler } from '@/films/application/query-handlers/get-rpc-film-by-kinopoisk-id.query-handler';
import { FilmPublicQueryRepository } from '@/films/infrastructure/film-public.query-repository';
import { FilmsPrivateOutputDtoMapper } from '@/films/api/dtos/output/films-private.output.dto';
import { ModerationMovieModule } from '@/moderation-movie/moderation-movie.module';

const queryHandlers = [
  GetPublicFilmByIdQueryHandler,
  GetPublicFilmsQueryHandler,
  GetPrivateFilmByKinopoiskIdQueryHandler,
  GetRpcFilmByKinopoiskIdQueryHandler,
];

const filmProvider = {
  provide: 'Film',
  useValue: Film,
};

const providers = [filmProvider];

const handlers = [NewFilmNotificationCommandHandler, NewFilmIsHandleNotificationCommandHandler];

const exportProviders = [FilmRepository, filmProvider, FilmQueryRepository];

@Module({
  imports: [
    TypeOrmModule.forFeature([Film]),
    MoviesModules,
    KinopoiskModule,
    ModerationMovieModule,
  ],
  controllers: [
    PublicFilmController,
    FilmPrivateController,
    FilmPrivateRpcController,
    FilmBridgeRmqController,
  ],
  providers: [
    ...queryHandlers,
    FilmQueryRepository,
    FilmsPublicOutputDtoMapper,
    FilmRepository,
    FilmsRpcOutputDtoMapper,
    FilmPublicQueryRepository,
    FilmsPrivateOutputDtoMapper,
    ...handlers,
    ...providers,
  ],
  exports: [...exportProviders],
})
export class FilmModule {}
