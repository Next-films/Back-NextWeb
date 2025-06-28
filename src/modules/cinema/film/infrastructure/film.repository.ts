import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Film } from '@/films/domain/film.entity';

@Injectable()
export class FilmRepository {
  constructor(@InjectRepository(Film) private readonly filmRepository: Repository<Film>) {}

  async save(film: Film, queryRunner?: QueryRunner): Promise<Film> {
    if (queryRunner) {
      return await queryRunner.manager.save(film);
    }
    return await this.filmRepository.save(film);
  }

  async getFilmByKinopoiskId(kpId: string, queryRunner?: QueryRunner): Promise<Film | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.filmRepository.target, { where: { kpId } });
    }
    return this.filmRepository.findOne({ where: { kpId } });
  }

  async getFilmById(id: number): Promise<Film | null> {
    return this.filmRepository.findOne({ where: { id } });
  }
}
