import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Film } from '@/films/domain/film.entity';

@Injectable()
export class FilmRepository {
  constructor(@InjectRepository(Film) private readonly filmRepository: Repository<Film>) {}

  async save(film: Film): Promise<void> {
    await this.filmRepository.save(film);
  }

  async getFilmByKinopoiskId(kpId: string): Promise<Film | null> {
    return this.filmRepository.findOne({ where: { kpId } });
  }
}
