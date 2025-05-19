import { Module } from '@nestjs/common';
import { FilmController } from '@/films/api/film.controller';
import { GetFilmByIdQueryHandler } from '@/films/application/query-handlers/get-film-by-id.query-handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Film } from '@/films/domain/film.entity';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { FilmsOutputDtoMapper } from '@/films/api/dtos/output/films.output.dto';
import { GetFilmsQueryHandler } from '@/films/application/query-handlers/get-films.query-handler';

const queryHandlers = [GetFilmByIdQueryHandler, GetFilmsQueryHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Film])],
  controllers: [FilmController],
  providers: [...queryHandlers, FilmQueryRepository, FilmsOutputDtoMapper],
  exports: [],
})
export class FilmModule {}
