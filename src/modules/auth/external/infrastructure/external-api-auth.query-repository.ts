import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExternalApiAuth } from '@/external-auth/domain/external-api-auth.entity';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';

@Injectable()
export class ExternalApiAuthQueryRepository {
  constructor(
    @InjectRepository(ExternalApiAuth)
    private readonly externalApiAuthRepository: Repository<ExternalApiAuth>,
  ) {}

  private getConditionsFindTokens(searchName: string | null): FindOptionsWhere<ExternalApiAuth> {
    if (searchName) {
      return {
        name: ILike(`%${searchName}%`),
      };
    }
    return {};
  }

  async getTokensCount(searchName: string | null): Promise<number> {
    const where = this.getConditionsFindTokens(searchName);
    return this.externalApiAuthRepository.count({ where });
  }

  async getTokens(
    skip: number,
    take: number,
    searchName: string | null,
  ): Promise<ExternalApiAuth[] | null> {
    const where = this.getConditionsFindTokens(searchName);
    const result = await this.externalApiAuthRepository.find({
      where,
      order: { updatedAt: SortDirectionEnum.DESC },
      skip,
      take,
    });

    return result && result.length > 0 ? result : null;
  }
}
