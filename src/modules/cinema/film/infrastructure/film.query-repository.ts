import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Film } from '@/films/domain/film.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { GetFilmsSortFieldEnum } from '@/films/api/dtos/input/get-films.input-query';

@Injectable()
export class FilmQueryRepository {
  constructor(@InjectRepository(Film) private readonly filmRepository: Repository<Film>) {}

  private getSearchFilmClause(searchName: string | null) {
    return searchName
      ? [
          { title: ILike(`%${searchName}%`) },
          { originalTitle: ILike(`%${searchName}%`) },
          { alternativeTitles: ILike(`%${searchName}%`) },
        ]
      : {};
  }

  async getFilmById(id: number): Promise<Film | null> {
    return this.filmRepository.findOne({ where: { id }, relations: { genres: true } });
  }

  async getFilms(
    sortField: GetFilmsSortFieldEnum,
    sortDirection: SortDirectionEnum,
    searchName: string | null,
  ): Promise<Film[] | null> {
    const where = this.getSearchFilmClause(searchName);

    return this.filmRepository.find({
      where,
      relations: { genres: true },
      order: { [sortField]: sortDirection },
    });
  }

  async getFilmsCount(searchName: string | null): Promise<number> {
    const where = this.getSearchFilmClause(searchName);
    const result = await this.filmRepository.count({ where });

    return result || 0;
  }
}
