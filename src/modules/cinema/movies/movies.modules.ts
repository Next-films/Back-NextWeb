import { Module } from '@nestjs/common';
import { MovieOutputDtoMapper } from '@/movies/api/dtos/output/movie.output.dto';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { GenerateGenreMigration } from '@/data-migrations/generate-genre.migration';
import { MoviesController } from '@/movies/api/movies.controller';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { GetGenreByIdQueryHandler } from '@/movies/application/query-handlers/get-genre-by-id.query-handler';
import { GenreQueryRepository } from '@/movies/infrastructure/genre.query-repository';
import { GenreOutputDtoMapper } from '@/movies/api/dtos/output/genre.output.dto';
import { GetAllGenreQueryHandler } from '@/movies/application/query-handlers/get-all-genre.query-handler';

export const GenreProvider = {
  provide: 'Genre',
  useValue: Genre,
};

const providers = [GenreProvider];

const exportProviders = [GenreProvider, TypeOrmModule.forFeature([Genre]), GenreRepository];

const queryCommands = [GetGenreByIdQueryHandler, GetAllGenreQueryHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Genre])],
  controllers: [MoviesController],
  providers: [
    MovieOutputDtoMapper,
    GenreOutputDtoMapper,
    GenerateGenreMigration,
    GenreRepository,
    GenreQueryRepository,
    ...providers,
    ...queryCommands,
  ],
  exports: [...exportProviders],
})
export class MoviesModules {}
