import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Film } from '@/films/domain/film.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { GetFilmsSortFieldEnum } from '@/films/api/dtos/input/get-films.input-query';
import { MovieHandleStatus } from '@/movies/domain/types';
import { MovieAvailabilityPolicy } from '@/movies/domain/movie-availability.policy';

@Injectable()
export class FilmPublicQueryRepository {
  constructor(@InjectRepository(Film) private readonly filmRepository: Repository<Film>) {}

  private resolveSortField(sortField?: GetFilmsSortFieldEnum): GetFilmsSortFieldEnum {
    if (!sortField) return GetFilmsSortFieldEnum.RELEASE_DATE;
    if (Object.values(GetFilmsSortFieldEnum).includes(sortField)) return sortField;
    return GetFilmsSortFieldEnum.RELEASE_DATE;
  }

  private resolveSortDirection(sortDirection?: SortDirectionEnum): SortDirectionEnum {
    if (!sortDirection) return SortDirectionEnum.DESC;
    if (sortDirection === SortDirectionEnum.ASC || sortDirection === SortDirectionEnum.DESC) {
      return sortDirection;
    }
    return SortDirectionEnum.DESC;
  }

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

    qb.andWhere(`f.isHidden = false`).andWhere(`f.handleStatus = :handleStatus`, {
      handleStatus: MovieHandleStatus.PRODUCTION,
    });
    qb.andWhere(`f.availabilityStatus IN (:...availabilityStatuses)`, {
      availabilityStatuses: MovieAvailabilityPolicy.publicStatuses,
    });

    return qb;
  }

  async getFilmById(id: number): Promise<Film | null> {
    return this.filmRepository.findOne({
      where: {
        id,
        isHidden: false,
        handleStatus: MovieHandleStatus.PRODUCTION,
        availabilityStatus: In(MovieAvailabilityPolicy.publicStatuses),
      },
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
    includeGenres = true,
  ): Promise<Film[] | null> {
    let qb = this.filmRepository.createQueryBuilder('f');
    if (includeGenres) {
      qb = qb.leftJoinAndSelect('f.genres', 'g');
    }
    qb = this.getSearchFilmClause(qb, searchName, searchGenreIds);
    const resolvedSortField = this.resolveSortField(sortField);
    const resolvedSortDirection = this.resolveSortDirection(sortDirection);
    qb.orderBy(`f.${resolvedSortField}`, resolvedSortDirection).skip(skip).take(take);

    return qb.getMany();
  }

  async getFilmsCount(searchName: string | null, searchGenreIds: number[] | null): Promise<number> {
    let qb = this.filmRepository.createQueryBuilder('f');
    qb = this.getSearchFilmClause(qb, searchName, searchGenreIds);
    const result = await qb.getCount();
    return result || 0;
  }
}
