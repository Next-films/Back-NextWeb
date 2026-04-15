import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeSectionsSettings } from '@/home-sections/domain/home-sections-settings.entity';

@Injectable()
export class HomeSectionsSettingsRepository {
  constructor(
    @InjectRepository(HomeSectionsSettings)
    private readonly repo: Repository<HomeSectionsSettings>,
  ) {}

  async findFirst(): Promise<HomeSectionsSettings | null> {
    const entities = await this.repo.find({
      order: { id: 'ASC' },
      take: 1,
    });
    return entities[0] ?? null;
  }

  async getOrCreateDefault(): Promise<HomeSectionsSettings> {
    const existing = await this.findFirst();
    if (existing) {
      return existing;
    }

    return this.save(HomeSectionsSettings.createDefault());
  }

  async save(entity: HomeSectionsSettings): Promise<HomeSectionsSettings> {
    return this.repo.save(entity);
  }
}
