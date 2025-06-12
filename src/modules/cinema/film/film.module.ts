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

const queryHandlers = [
  GetFilmByIdQueryHandler,
  GetFilmsQueryHandler,
  GetFilmByKinopoiskIdQueryHandler,
];

@Module({
  imports: [TypeOrmModule.forFeature([Film])],
  controllers: [FilmController, FilmPrivateController, FilmPrivateRpcController],
  providers: [...queryHandlers, FilmQueryRepository, FilmsOutputDtoMapper],
  exports: [],
})
export class FilmModule {}
