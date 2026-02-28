import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { QueryRunner, Repository } from 'typeorm';

@Injectable()
export class GenreRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async save(genre: Genre, queryRunner?: QueryRunner): Promise<Genre> {
    if (queryRunner) {
      await queryRunner.manager.upsert(this.genreRepository.target, [genre], {
        conflictPaths: ['name'],
      });

      const genreResult = await queryRunner.manager.findOneBy(this.genreRepository.target, {
        name: genre.name,
      });

      return genreResult!;
    }

    return this.genreRepository.save(genre);
  }

  async getByName(name: string): Promise<Genre | null> {
    return this.genreRepository.findOne({ where: { name } });
  }

  async getByNames(names: string[], queryRunner?: QueryRunner): Promise<Genre[]> {
    if (queryRunner) {
      return queryRunner.manager.find(this.genreRepository.target, {
        where: names.map(name => ({ name })),
      });
    }
    return this.genreRepository.find({
      where: names.map(name => ({ name })),
    });
  }
}
