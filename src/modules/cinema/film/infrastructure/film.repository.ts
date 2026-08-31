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

  async remove(film: Film): Promise<void> {
    await this.filmRepository.remove(film);
  }

  async getFilmByKinopoiskId(kpId: string, queryRunner?: QueryRunner): Promise<Film | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.filmRepository.target, { where: { kpId } });
    }
    return this.filmRepository.findOne({ where: { kpId } });
  }

  // Читает строку под блокировкой на запись. Нужно для замены источника: два
  // параллельных вызова иначе прочитают одну и ту же ссылку, и вызывающая сторона
  // удалит из хранилища файл, на который уже ссылается вторая транзакция.
  async getFilmByKinopoiskIdForUpdate(
    kpId: string,
    queryRunner: QueryRunner,
  ): Promise<Film | null> {
    return queryRunner.manager.findOne(this.filmRepository.target, {
      where: { kpId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async getFilmById(id: number, queryRunner?: QueryRunner): Promise<Film | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.filmRepository.target, {
        where: { id },
        relations: { genres: true },
      });
    }
    return this.filmRepository.findOne({ where: { id }, relations: { genres: true } });
  }
}
