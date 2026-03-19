import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { GetSerialSortFieldEnum } from '@/serials/api/dtos/input/get-serial.input-query';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { AdminGetFilmsStatusEnum } from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';
import { AdminGetFilmsSortFieldEnum } from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';

@Injectable()
export class SerialQueryRepository {
  constructor(
    @InjectRepository(Serial) private readonly serialRepository: Repository<Serial>,
    @InjectRepository(SerialEpisode) private readonly episodeRepository: Repository<SerialEpisode>,
  ) {}

  private getSearchSerialClause(
    qb: SelectQueryBuilder<Serial>,
    searchName: string | null,
    searchGenreIds: number[] | null,
    status?: AdminGetFilmsStatusEnum | null,
  ): SelectQueryBuilder<Serial> {
    if (searchGenreIds && searchGenreIds.length > 0) {
      qb.where(qb => {
        const subQuery = qb
          .subQuery()
          .select('f_sub.id')
          .from(this.serialRepository.target, 'f_sub')
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

    if (status !== null && status !== undefined) {
      if (status !== AdminGetFilmsStatusEnum.ALL)
        qb.andWhere('f.handleStatus = :status', { status });
    }

    return qb;
  }

  async getSerialById(id: number): Promise<Serial | null> {
    return this.serialRepository.findOne({
      where: { id },
      relations: {
        genres: true,
        episodes: { season: true },
        seasons: { episodes: true },
      },
    });
  }

  async getSerialByKinopoiskId(kpId: string): Promise<Serial | null> {
    return this.serialRepository.findOne({
      where: { kpId },
      relations: {
        genres: true,
        episodes: { season: true },
        seasons: { episodes: true },
      },
    });
  }

  async getSerialEpisodeById(serialId: number, episodeId: number): Promise<SerialEpisode | null> {
    return this.episodeRepository.findOne({
      where: { id: episodeId, serialId },
    });
  }

  async getSerials(
    sortField: GetSerialSortFieldEnum | AdminGetFilmsSortFieldEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchName: string | null,
    searchGenreIds: number[] | null,
    status?: AdminGetFilmsStatusEnum | null,
  ): Promise<Serial[] | null> {
    let qb = this.serialRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds, status || null);

    qb.leftJoinAndSelect('f.episodes', 'e')
      .leftJoinAndSelect('e.season', 's')
      .skip(skip)
      .take(take)
      .orderBy(`f.${sortField}`, sortDirection)
      .addOrderBy('s.seasonNumber', 'ASC')
      .addOrderBy('e.id', 'ASC');

    return qb.getMany();
  }

  async getSerialCount(
    searchName: string | null,
    searchGenreIds: number[] | null,
    status?: AdminGetFilmsStatusEnum | null,
  ): Promise<number> {
    let qb = this.serialRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds, status || null);
    const result = await qb.getCount();
    return result || 0;
  }
}
