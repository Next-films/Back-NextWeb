import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '@/banner/domain/banner.entity';

@Injectable()
export class BannerRepository {
  constructor(
    @InjectRepository(Banner)
    private readonly repo: Repository<Banner>,
  ) {}

  async findAll(): Promise<Banner[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async findAllActive(): Promise<Banner[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Banner | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(banner: Banner): Promise<Banner> {
    return this.repo.save(banner);
  }

  async remove(banner: Banner): Promise<void> {
    await this.repo.remove(banner);
  }

  async getMaxSortOrder(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('banner')
      .select('MAX(banner.sortOrder)', 'max')
      .getRawOne();
    return result?.max ?? 0;
  }
}
