import { Module } from '@nestjs/common';
import { MoviePublicOutputDtoMapper } from '@/movies/api/dtos/output/movie-public.output.dto';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { GenerateGenreMigration } from '@/data-migrations/generate-genre.migration';
import { MoviesController } from '@/movies/api/movies.controller';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { GetGenreByIdQueryHandler } from '@/movies/application/query-handlers/get-genre-by-id.query-handler';
import { GenreQueryRepository } from '@/movies/infrastructure/genre.query-repository';
import { GenreOutputDtoMapper } from '@/movies/api/dtos/output/genre.output.dto';
import { GetAllGenreQueryHandler } from '@/movies/application/query-handlers/get-all-genre.query-handler';
import { MoviesService } from '@/movies/application/movies.service';
import { MovieRpcOutputDtoMapper } from '@/movies/api/dtos/output/movie-rpc.output.dto';
import { MoviePrivateOutputDtoMapper } from '@/movies/api/dtos/output/movie-private.output.dto';
import { MovieMetadataCardService } from '@/movies/application/movie-metadata-card.service';
import { ExternalMovieAssetsService } from '@/movies/application/external-movie-assets.service';
import { KinopoiskModule } from '@/external-api/kinopoisk/kinopoisk.module';
import { TmdbModule } from '@/external-api/tmdb/tmdb.module';

export const GenreProvider = {
  provide: 'Genre',
  useValue: Genre,
};

const providers = [GenreProvider];

const exportProviders = [
  GenreProvider,
  TypeOrmModule.forFeature([Genre]),
  GenreRepository,
  MoviesService,
  MovieMetadataCardService,
  ExternalMovieAssetsService,
];

const queryCommands = [GetGenreByIdQueryHandler, GetAllGenreQueryHandler];

@Module({
  imports: [TypeOrmModule.forFeature([Genre]), KinopoiskModule, TmdbModule],
  controllers: [MoviesController],
  providers: [
    MoviePublicOutputDtoMapper,
    GenreOutputDtoMapper,
    MovieRpcOutputDtoMapper,
    GenerateGenreMigration,
    GenreRepository,
    GenreQueryRepository,
    MoviePrivateOutputDtoMapper,
    MoviesService,
    MovieMetadataCardService,
    ExternalMovieAssetsService,
    ...providers,
    ...queryCommands,
  ],
  exports: [...exportProviders],
})
export class MoviesModules {}
