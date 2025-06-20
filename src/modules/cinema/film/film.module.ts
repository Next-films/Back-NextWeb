import { Module } from '@nestjs/common';
import { FilmController } from '@/films/api/film.controller';
import { GetFilmByIdQueryHandler } from '@/films/application/query-handlers/get-film-by-id.query-handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Film } from '@/films/domain/film.entity';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { FilmsOutputDtoMapper } from '@/films/api/dtos/output/films.output.dto';
import { GetFilmsQueryHandler } from '@/films/application/query-handlers/get-films.query-handler';
import { GetFilmByKinopoiskIdQueryHandler } from '@/films/application/query-handlers/get-film-by-kinopoisk-id.query-handler';
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

const queryHandlers = [
  GetFilmByIdQueryHandler,
  GetFilmsQueryHandler,
  GetFilmByKinopoiskIdQueryHandler,
  GetRpcFilmByKinopoiskIdQueryHandler,
];

const filmProvider = {
  provide: 'Film',
  useValue: Film,
};

const providers = [filmProvider];

const handlers = [NewFilmNotificationCommandHandler, NewFilmIsHandleNotificationCommandHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Film]), MoviesModules, KinopoiskModule],
  controllers: [
    FilmController,
    FilmPrivateController,
    FilmPrivateRpcController,
    FilmBridgeRmqController,
  ],
  providers: [
    ...queryHandlers,
    FilmQueryRepository,
    FilmsOutputDtoMapper,
    FilmRepository,
    FilmsRpcOutputDtoMapper,
    ...handlers,
    ...providers,
  ],
  exports: [],
})
export class FilmModule {}
