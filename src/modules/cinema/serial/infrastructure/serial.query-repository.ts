import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { GetSerialSortFieldEnum } from '@/serials/api/dtos/input/get-serial.input-query';
import { Serial } from '@/serials/domain/serial.entity';
import {SerialEpisode} from "@/serials/domain/serial-episode.entity";

@Injectable()
export class SerialQueryRepository {
  constructor(
      @InjectRepository(Serial) private readonly serialRepository: Repository<Serial>,
      @InjectRepository(SerialEpisode) private readonly episodeRepository: Repository<SerialEpisode>) {
  }

  private getSearchSerialClause(
      qb: SelectQueryBuilder<Serial>,
      searchName: string | null,
      searchGenreIds: number[] | null,
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

    return qb;
  }

  async getSerialById(id: number): Promise<Serial | null> {
    return this.serialRepository.findOne({
      where: { id },
      relations: { genres: true, episodes: true },
    });
  }

  async getSerialEpisodeById(serialId: number, episodeId: number): Promise<SerialEpisode | null> {
    return this.episodeRepository.findOne({
      where: { id: episodeId, serialId },
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
    let qb = this.serialRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds);

    qb.leftJoin(`f.episodes`, 'e')
      .addSelect('e.id')
      .groupBy('f.id, g.id, e.id')
      .offset(skip)
      .limit(take)
      .orderBy(`f."${sortField}"`, sortDirection);

    return qb.getMany();
  }

  async getSerialCount(
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): Promise<number> {
    let qb = this.serialRepository.createQueryBuilder('f').leftJoinAndSelect('f.genres', 'g');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds);
    const result = await qb.getCount();
    return result || 0;
  }
}
