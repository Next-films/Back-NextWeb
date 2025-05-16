import { Module } from '@nestjs/common';
import { FilmController } from '@/films/api/film.controller';
import { GetFilmByIdQueryHandler } from '@/films/application/query-handlers/get-film-by-id.query-handler';

const queryHandlers = [GetFilmByIdQueryHandler];

@Module({
  imports: [],
  controllers: [FilmController],
  providers: [...queryHandlers],
  exports: [],
})
export class FilmModule {}
