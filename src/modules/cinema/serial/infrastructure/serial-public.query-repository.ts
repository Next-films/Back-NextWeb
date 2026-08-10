import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Serial } from '../domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { GetSerialSortFieldEnum } from '@/serials/api/dtos/input/get-serial.input-query';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { MovieHandleStatus } from '@/movies/domain/types';
import { MovieAvailabilityPolicy } from '@/movies/domain/movie-availability.policy';

@Injectable()
export class SerialPublicQueryRepository {
  constructor(
    @InjectRepository(Serial) private readonly serialRepository: Repository<Serial>,
    @InjectRepository(SerialEpisode) private readonly episodeRepository: Repository<SerialEpisode>,
  ) {}

  private resolveSortField(sortField?: GetSerialSortFieldEnum): GetSerialSortFieldEnum {
    if (!sortField) return GetSerialSortFieldEnum.RELEASE_DATE;
    if (Object.values(GetSerialSortFieldEnum).includes(sortField)) return sortField;
    return GetSerialSortFieldEnum.RELEASE_DATE;
  }

  private resolveSortDirection(sortDirection?: SortDirectionEnum): SortDirectionEnum {
    if (!sortDirection) return SortDirectionEnum.DESC;
    if (sortDirection === SortDirectionEnum.ASC || sortDirection === SortDirectionEnum.DESC) {
      return sortDirection;
    }
    return SortDirectionEnum.DESC;
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

    qb.andWhere(`s.isHidden = false`).andWhere(`s.handleStatus = :handleStatus`, {
      handleStatus: MovieHandleStatus.PRODUCTION,
    });
    qb.andWhere(`s.availabilityStatus IN (:...availabilityStatuses)`, {
      availabilityStatuses: MovieAvailabilityPolicy.publicStatuses,
    });

    return qb;
  }

  async getSerialById(id: number): Promise<Serial | null> {
    return this.serialRepository.findOne({
      where: {
        id,
        isHidden: false,
        handleStatus: MovieHandleStatus.PRODUCTION,
        availabilityStatus: In(MovieAvailabilityPolicy.publicStatuses),
      },
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
      relations: { season: true },
    });
  }

  async getSerials(
    sortField: GetSerialSortFieldEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchName: string | null,
    searchGenreIds: number[] | null,
    includeEpisodes = true,
    includeGenres = true,
  ): Promise<Serial[] | null> {
    let qb = this.serialRepository.createQueryBuilder('s');
    if (includeGenres) {
      qb = qb.leftJoinAndSelect('s.genres', 'g');
    }
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds);

    if (includeEpisodes) {
      qb.leftJoinAndSelect('s.episodes', 'e');
    } else {
      qb.loadRelationCountAndMap('s.episodesCount', 's.episodes');
    }
    const resolvedSortField = this.resolveSortField(sortField);
    const resolvedSortDirection = this.resolveSortDirection(sortDirection);
    qb.skip(skip).take(take).orderBy(`s.${resolvedSortField}`, resolvedSortDirection);

    return qb.getMany();
  }

  async getSerialCount(
    searchName: string | null,
    searchGenreIds: number[] | null,
  ): Promise<number> {
    let qb = this.serialRepository.createQueryBuilder('s');
    qb = this.getSearchSerialClause(qb, searchName, searchGenreIds);
    return (await qb.getCount()) || 0;
  }
}
