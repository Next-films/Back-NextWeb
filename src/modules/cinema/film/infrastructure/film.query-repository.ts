import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Film } from '@/films/domain/film.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  AdminGetFilmsSortFieldEnum,
  AdminGetFilmsStatusEnum,
} from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';
import { MovieAvailabilityStatus } from '@/movies/domain/types';

@Injectable()
export class FilmQueryRepository {
  constructor(@InjectRepository(Film) private readonly filmRepository: Repository<Film>) {}

  private getSearchFilmClause(
    qb: SelectQueryBuilder<Film>,
    searchName: string | null,
    searchGenreIds: number[] | null,
    status: AdminGetFilmsStatusEnum | null,
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

    if (status !== null) {
      if (status !== AdminGetFilmsStatusEnum.ALL)
        qb.andWhere('f.handleStatus = :status', { status });
    }

    qb.andWhere('f.availabilityStatus = :availabilityStatus', {
      availabilityStatus: MovieAvailabilityStatus.AVAILABLE,
    });

    return qb;
  }

  async getFilmById(id: number): Promise<Film | null> {
    return this.filmRepository.findOne({
      where: { id },
      relations: { genres: true },
    });
  }

  async getFilmByKinopoiskId(kpId: string): Promise<Film | null> {
    return this.filmRepository.findOne({
      where: { kpId },
      relations: { genres: true },
    });
  }

  async getFilms(
    sortField: AdminGetFilmsSortFieldEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchName: string | null,
    searchGenreIds: number[] | null,
    status: AdminGetFilmsStatusEnum | null,
  ): Promise<Film[] | null> {
    let qb = this.filmRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchFilmClause(qb, searchName, searchGenreIds, status);

    qb.orderBy(`f.${sortField}`, sortDirection).skip(skip).take(take);

    return qb.getMany();
  }

  async getFilmsCount(
    searchName: string | null,
    searchGenreIds: number[] | null,
    status: AdminGetFilmsStatusEnum | null,
  ): Promise<number> {
    let qb = this.filmRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchFilmClause(qb, searchName, searchGenreIds, status);
    const result = await qb.getCount();
    return result || 0;
  }
}
