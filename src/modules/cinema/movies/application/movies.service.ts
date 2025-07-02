import { Inject, Injectable } from '@nestjs/common';
import { KinopoiskItemName } from '@/external-api/kinopoisk/domain/types';
import { Genre } from '@/movies/domain/genre.entity';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { QueryRunner } from 'typeorm';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(Genre.name) private readonly genreEntity: typeof Genre,
    private readonly genreRepository: GenreRepository,
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
}
