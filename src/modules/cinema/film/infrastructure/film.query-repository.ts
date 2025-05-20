import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Film } from '@/films/domain/film.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { GetFilmsSortFieldEnum } from '@/films/api/dtos/input/get-films.input-query';

@Injectable()
export class FilmQueryRepository {
  constructor(@InjectRepository(Film) private readonly filmRepository: Repository<Film>) {}

  private getSearchFilmClause(
    qb: SelectQueryBuilder<Film>,
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): SelectQueryBuilder<Film> {
    if (searchGenreIds && searchGenreIds.length > 0) {
      qb.where(qb => {
        const subQuery = qb
          .subQuery()
          .select('f_sub.id')
          .from(this.filmRepository.target, 'f_sub')
          .innerJoin('f_sub.genres', 'ge')
          .where('ge.id IN (:...searchGenreIds)', { searchGenreIds })
          .getQuery();
        return 'f.id IN ' + subQuery;
      });
    }

    if (searchName) {
      const searchValue = `%${searchName}%`;

      const searchCondition = new Brackets(qb => {
        qb.where('f.title ILIKE :search')
          .orWhere('f.originalTitle ILIKE :search')
          .orWhere('f.alternativeTitles ILIKE :search');
      });

      if (searchGenreIds && searchGenreIds.length > 0) {
        qb.andWhere(searchCondition);
      } else {
        qb.where(searchCondition);
      }

      qb.setParameter('search', searchValue);
    }

    return qb;
  }

  async getFilmById(id: number): Promise<Film | null> {
    return this.filmRepository.findOne({
      where: { id },
      relations: { genres: true },
    });
  }

  async getFilms(
    sortField: GetFilmsSortFieldEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): Promise<Film[] | null> {
    let qb = this.filmRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchFilmClause(qb, searchName, searchGenreIds);

    qb.orderBy(`f.${sortField}`, sortDirection).skip(skip).take(take);

    return qb.getMany();
  }

  async getFilmsCount(searchName: string | null, searchGenreIds: number[] | null): Promise<number> {
    let qb = this.filmRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchFilmClause(qb, searchName, searchGenreIds);
    const result = await qb.getCount();
    return result || 0;
  }
}
