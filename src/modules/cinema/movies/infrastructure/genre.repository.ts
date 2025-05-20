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

  async save(genre: Genre): Promise<number> {
    const newGenre = await this.genreRepository.save(genre);
    return newGenre.id;
  }

  async getByName(name: string): Promise<Genre | null> {
    return this.genreRepository.findOne({ where: { name } });
  }
}
