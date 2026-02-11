import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';

@Injectable()
export class ExternalApiConfigQueryRepository {
  constructor(
    @InjectRepository(ExternalApiConfigEntity)
    private readonly externalApiConfigRepo: Repository<ExternalApiConfigEntity>,
  ) {}

  async getConfigs(
    sortField: keyof ExternalApiConfigEntity,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    provider?: ExternalApiProviderEnum,
    target?: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity[] | null> {
    const where: FindOptionsWhere<ExternalApiConfigEntity> = {};
    if (provider) where.provider = provider;
    if (target) where.target = target;

    const result = await this.externalApiConfigRepo.find({
      where,
      order: { [sortField]: sortDirection },
      skip,
      take,
    });

    return result && result.length ? result : null;
  }

  async getConfigsCount(
    provider?: ExternalApiProviderEnum,
    target?: ExternalApiTargetEnum,
  ): Promise<number> {
    const where: FindOptionsWhere<ExternalApiConfigEntity> = {};
    if (provider) where.provider = provider;
    if (target) where.target = target;
    return this.externalApiConfigRepo.count({ where });
  }

  async getActiveConfigsByProviderTarget(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity[] | null> {
    const result = await this.externalApiConfigRepo.find({
      where: {
        provider,
        target: In([target, ExternalApiTargetEnum.ALL]),
        isEnabled: true,
      },
      order: { updatedAt: 'DESC' },
    });

    return result && result.length ? result : null;
  }
}
