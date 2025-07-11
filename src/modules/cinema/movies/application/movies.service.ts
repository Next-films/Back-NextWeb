import { Inject, Injectable } from '@nestjs/common';
import { KinopoiskItemName, KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { Genre } from '@/movies/domain/genre.entity';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { QueryRunner } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieHandleStatus, MovieKpMetadata } from '@/movies/domain/types';
import { DateUtil } from '@/common/utils/date.util';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(Genre.name) private readonly genreEntity: typeof Genre,
    private readonly genreRepository: GenreRepository,
    private readonly dateUtil: DateUtil,
  ) {}

  async getOrCreateGenreFromKinopoisk(
    genres: KinopoiskItemName[],
    queryRunner?: QueryRunner,
  ): Promise<Genre[]> {
    const names = [...new Set(genres.map(g => g.name.toLowerCase()))];

    const existingGenres = await this.genreRepository.getByNames(names, queryRunner);

    const existingNames = new Set(existingGenres.map(g => g.name.toLowerCase()));
    const newGenresData = names
      .filter(name => !existingNames.has(name))
      .map(name => this.genreEntity.create(name));

    const createdGenres =
      newGenresData && newGenresData.length > 0
        ? await Promise.all(newGenresData.map(g => this.genreRepository.save(g, queryRunner)))
        : [];

    return [...existingGenres, ...createdGenres];
  }

  async getOrCreateGenre(genres: string[], queryRunner?: QueryRunner): Promise<Genre[]> {
    const names = [...new Set(genres.map(g => g.toLowerCase()))];

    const existingGenres = await this.genreRepository.getByNames(names, queryRunner);

    const existingNames = new Set(existingGenres.map(g => g.name.toLowerCase()));
    const newGenresData = names
      .filter(name => !existingNames.has(name))
      .map(name => this.genreEntity.create(name));

    const createdGenres =
      newGenresData && newGenresData.length > 0
        ? await Promise.all(newGenresData.map(g => this.genreRepository.save(g, queryRunner)))
        : [];

    return [...existingGenres, ...createdGenres];
  }

  isValidMovieForProduction<T extends MovieEntity>(movie: T): boolean {
    const {
      title,
      originalTitle,
      description,
      country,
      alternativeTitles,
      releaseDate,
      trailerUrl,
      backgroundContentUrl,
      previewUrl,
      titleUrl,
      videoUrl,
      duration,
      genres,
    } = movie;

    if (
      !title ||
      !description ||
      !originalTitle ||
      !releaseDate ||
      !trailerUrl ||
      !videoUrl ||
      !previewUrl ||
      !backgroundContentUrl ||
      !titleUrl ||
      !duration ||
      duration === 0 ||
      !genres ||
      genres.length <= 0 ||
      !country ||
      country.length <= 0 ||
      !alternativeTitles
    )
      return false;

    return true;
  }

  async extractMovieMetadata(
    kpMovie: KinopoiskMovie | null,
    queryRunner?: QueryRunner,
  ): Promise<MovieKpMetadata> {
    if (!kpMovie) {
      return {
        name: null,
        originalName: null,
        alternativeName: null,
        genres: null,
        countries: null,
        description: null,
        releaseDate: null,
      };
    }

    const {
      name: rawName,
      enName,
      alternativeName: rawAlternativeName,
      year,
      countries,
      premiere,
      description,
      genres: rawGenres,
    } = kpMovie || {};

    let worldReleaseDate: string | null = null;

    if (premiere) {
      const { world } = premiere;
      worldReleaseDate = world || null;
    }

    const name = rawName || rawAlternativeName || enName || null;
    const originalName = enName || rawAlternativeName || null;
    const alternativeName = [rawName, rawAlternativeName, enName, year].filter(Boolean).join(' ');

    const genres = rawGenres
      ? await this.getOrCreateGenreFromKinopoisk(rawGenres, queryRunner)
      : null;

    const countryNames = countries?.map(c => c.name) || null;

    return {
      name,
      originalName,
      alternativeName,
      genres,
      countries: countryNames,
      description: description || null,
      releaseDate: worldReleaseDate ? this.dateUtil.formatDateYyMmDd(worldReleaseDate) : null,
    };
  }

  isFilmInProductionOrModerate<T extends MovieEntity>(movie: T | null): boolean {
    return (
      movie?.handleStatus === MovieHandleStatus.PRODUCTION ||
      movie?.handleStatus === MovieHandleStatus.MODERATE
    );
  }

  setHandleProductionStatus<T extends MovieEntity>(movie: T): void {
    const isValid = this.isValidMovieForProduction(movie);
    movie.updateHandleStatus(isValid ? MovieHandleStatus.PRODUCTION : MovieHandleStatus.MODERATE);
  }
}
