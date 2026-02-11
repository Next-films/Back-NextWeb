import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

@Injectable()
export class ExternalApiConfigRepository {
  constructor(
    @InjectRepository(ExternalApiConfigEntity)
    private readonly externalApiConfigRepo: Repository<ExternalApiConfigEntity>,
  ) {}

  async getById(id: number): Promise<ExternalApiConfigEntity | null> {
    return this.externalApiConfigRepo.findOne({ where: { id } });
  }

  async getByProviderTarget(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity | null> {
    return this.externalApiConfigRepo.findOne({ where: { provider, target } });
  }

  async save(entity: ExternalApiConfigEntity): Promise<ExternalApiConfigEntity> {
    return this.externalApiConfigRepo.save(entity);
  }

  async remove(entity: ExternalApiConfigEntity): Promise<void> {
    await this.externalApiConfigRepo.remove(entity);
  }

  async upsertByProviderTarget(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
    payload: Partial<ExternalApiConfigEntity>,
  ): Promise<ExternalApiConfigEntity> {
    const existing = await this.getByProviderTarget(provider, target);
    if (existing) {
      Object.assign(existing, payload);
      return this.externalApiConfigRepo.save(existing);
    }

    const entity = this.externalApiConfigRepo.create({
      provider,
      target,
      ...payload,
    });

    return this.externalApiConfigRepo.save(entity);
  }
}
