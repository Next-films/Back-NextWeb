import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { GetCartoonSortFieldEnum } from '@/cartoons/api/dtos/input/get-cartoon.input-query';
import { MovieHandleStatus } from '@/movies/domain/types';

@Injectable()
export class CartoonPublicQueryRepository {
  constructor(@InjectRepository(Cartoon) private readonly cartoonRepository: Repository<Cartoon>) {}

  private resolveSortField(sortField?: GetCartoonSortFieldEnum): GetCartoonSortFieldEnum {
    if (!sortField) return GetCartoonSortFieldEnum.RELEASE_DATE;
    if (Object.values(GetCartoonSortFieldEnum).includes(sortField)) return sortField;
    return GetCartoonSortFieldEnum.RELEASE_DATE;
  }

  private resolveSortDirection(sortDirection?: SortDirectionEnum): SortDirectionEnum {
    if (!sortDirection) return SortDirectionEnum.DESC;
    if (sortDirection === SortDirectionEnum.ASC || sortDirection === SortDirectionEnum.DESC) {
      return sortDirection;
    }
    return SortDirectionEnum.DESC;
  }

  private getSearchCartoonClause(
    qb: SelectQueryBuilder<Cartoon>,
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): SelectQueryBuilder<Cartoon> {
    if (searchGenreIds && searchGenreIds.length > 0) {
      qb.where(qb => {
        const subQuery = qb
          .subQuery()
          .select('f_sub.id')
          .from(this.cartoonRepository.target, 'f_sub')
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

    return qb;
  }

  async getCartoonById(id: number): Promise<Cartoon | null> {
    return this.cartoonRepository.findOne({
      where: { id, isHidden: false, handleStatus: MovieHandleStatus.PRODUCTION },
      relations: { genres: true },
    });
  }

  async getCartoons(
    sortField: GetCartoonSortFieldEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchName: string | null,
    searchGenreIds: number[] | null,
    includeGenres = true,
  ): Promise<Cartoon[] | null> {
    let qb = this.cartoonRepository.createQueryBuilder('f');
    if (includeGenres) {
      qb = qb.leftJoinAndSelect('f.genres', 'g');
    }
    qb = this.getSearchCartoonClause(qb, searchName, searchGenreIds);
    const resolvedSortField = this.resolveSortField(sortField);
    const resolvedSortDirection = this.resolveSortDirection(sortDirection);
    qb.skip(skip).take(take).orderBy(`f.${resolvedSortField}`, resolvedSortDirection);
    return qb.getMany();
  }

  async getCartoonCount(
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): Promise<number> {
    let qb = this.cartoonRepository.createQueryBuilder('f');
    qb = this.getSearchCartoonClause(qb, searchName, searchGenreIds);
    const result = await qb.getCount();
    return result || 0;
  }
}
