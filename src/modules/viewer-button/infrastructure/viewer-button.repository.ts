import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewerButton } from '@/viewer-button/domain/viewer-button.entity';

@Injectable()
export class ViewerButtonRepository {
  constructor(
    @InjectRepository(ViewerButton)
    private readonly repo: Repository<ViewerButton>,
  ) {}

  async findAll(): Promise<ViewerButton[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async findAllActive(): Promise<ViewerButton[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findById(id: number): Promise<ViewerButton | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(entity: ViewerButton): Promise<ViewerButton> {
    return this.repo.save(entity);
  }

  async remove(entity: ViewerButton): Promise<void> {
    await this.repo.remove(entity);
  }

  async getCount(): Promise<number> {
    return this.repo.count();
  }

  async getMaxSortOrder(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('viewer_button')
      .select('MAX(viewer_button.sortOrder)', 'max')
      .getRawOne();
    return result?.max ?? 0;
  }
}
