import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { TorApiProvidersEnum } from '@/common/types/types';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';

@Injectable()
export class BannedProvidersMovieQueryRepository {
  constructor(
    @InjectRepository(BannedProvidersMovie)
    private readonly bannedProvidersMovieRepository: Repository<BannedProvidersMovie>,
  ) {}

  private getBannedMoviesCondition(
    provider: TorApiProvidersEnum | null,
    providerId: string | null,
    movieName: string | null,
  ): FindOptionsWhere<BannedProvidersMovie> {
    const where: FindOptionsWhere<BannedProvidersMovie> = {};

    if (provider) {
      where.provider = provider;
    }

    if (providerId) {
      where.providerId = ILike(`%${providerId}%`);
    }

    if (movieName) {
      where.movieName = ILike(`%${movieName}%`);
    }

    return where;
  }

  async getBannedProviderMovie(
    provider: TorApiProvidersEnum,
    providerId: string,
  ): Promise<BannedProvidersMovie | null> {
    return this.bannedProvidersMovieRepository.findOne({
      where: {
        provider,
        providerId,
      },
    });
  }

  async getBannedMoviesCount(
    provider: TorApiProvidersEnum | null,
    providerId: string | null,
    movieName: string | null,
  ): Promise<number> {
    const where = this.getBannedMoviesCondition(provider, providerId, movieName);
    return this.bannedProvidersMovieRepository.count({ where });
  }

  async getBannedMoviesByFilter(
    skip: number,
    take: number,
    provider: TorApiProvidersEnum | null,
    providerId: string | null,
    movieName: string | null,
  ): Promise<BannedProvidersMovie[] | null> {
    const where = this.getBannedMoviesCondition(provider, providerId, movieName);

    const result = await this.bannedProvidersMovieRepository.find({
      where,
      skip,
      take,
      order: { createdAt: SortDirectionEnum.DESC },
    });
    return result && result.length > 0 ? result : null;
  }
}
