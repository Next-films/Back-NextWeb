import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  ShortContentJob,
  ShortContentJobStatus,
  ShortContentType,
} from '@/admin/domain/short-content-job.entity';

@Injectable()
export class ShortContentJobRepository {
  constructor(
    @InjectRepository(ShortContentJob)
    private readonly repo: Repository<ShortContentJob>,
  ) {}

  async findAll(filter?: {
    contentType?: ShortContentType;
    status?: ShortContentJobStatus;
  }): Promise<ShortContentJob[]> {
    const where: FindOptionsWhere<ShortContentJob> = {};

    if (filter?.contentType) where.contentType = filter.contentType;
    if (filter?.status) where.status = filter.status;

    return this.repo.find({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 100,
    });
  }

  async findById(id: number): Promise<ShortContentJob | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(entity: ShortContentJob): Promise<ShortContentJob> {
    return this.repo.save(entity);
  }
}
