import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Serial } from '../domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { GetSerialSortFieldEnum } from '@/serials/api/dtos/input/get-serial.input-query';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';

@Injectable()
export class SerialPublicQueryRepository {
  constructor(
    @InjectRepository(Serial) private readonly serialRepository: Repository<Serial>,
    @InjectRepository(SerialEpisode) private readonly episodeRepository: Repository<SerialEpisode>,
  ) {}

  private getSearchSerialClause(
    qb: SelectQueryBuilder<Serial>,
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): SelectQueryBuilder<Serial> {
    if (searchGenreIds && searchGenreIds.length > 0) {
      qb.where(qb => {
        const subQuery = qb
          .subQuery()
          .select('s_sub.id')
          .from(this.serialRepository.target, 's_sub')
          .innerJoin('s_sub.genres', 'ge')
          .where('ge.id IN (:...searchGenreIds)', { searchGenreIds })
          .getQuery();
        return 's.id IN ' + subQuery;
      });
    }

    if (searchName) {
      const searchValue = `%${searchName}%`;
      const searchCondition = new Brackets(qb => {
        qb.where('s.title ILIKE :search')
          .orWhere('s.originalTitle ILIKE :search')
          .orWhere('s.alternativeTitles ILIKE :search');
      });

      if (searchGenreIds && searchGenreIds.length > 0) {
        qb.andWhere(searchCondition);
      } else {
        qb.where(searchCondition);
      }

      qb.setParameter('search', searchValue);
    }

    // Можно добавить фильтр по статусу сериала, если есть поле вроде `isHidden` или `handleStatus`
    qb.andWhere(`s.isHidden = false`);

    return qb;
  }

  async getSerialById(id: number): Promise<Serial | null> {
    return this.serialRepository.findOne({
      where: { id },
      relations: { genres: true, episodes: true },
    });
  }

  async getSerials(
    sortField: GetSerialSortFieldEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): Promise<Serial[] | null> {
    let qb = this.serialRepository.createQueryBuilder('s').leftJoinAndSelect('s.genres', 'g');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds);

    qb.leftJoin(`s.episodes`, 'e')
      .addSelect('e.id')
      .groupBy('s.id, g.id, e.id')
      .skip(skip)
      .take(take)
      .orderBy(`s.${sortField}`, sortDirection);

    return qb.getMany();
  }

  async getSerialCount(
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): Promise<number> {
    let qb = this.serialRepository.createQueryBuilder('s').leftJoinAndSelect('s.genres', 'g');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds);
    return (await qb.getCount()) || 0;
  }
}
