import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GenreRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async save(genre: Genre): Promise<Genre> {
    return this.genreRepository.save(genre);
  }

  async getByName(name: string): Promise<Genre | null> {
    return this.genreRepository.findOne({ where: { name } });
  }

  async getByNames(names: string[]): Promise<Genre[]> {
    return this.genreRepository.find({
      where: names.map(name => ({ name })),
    });
  }
}
