import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';

@Injectable()
export class ModerationCartoonRepository {
  constructor(
    @InjectRepository(ModerationCartoonEntity)
    private readonly moderationCartoonEntity: Repository<ModerationCartoonEntity>,
  ) {}

  async save(
    moderationMovie: ModerationCartoonEntity,
    queryRunner?: QueryRunner,
  ): Promise<ModerationCartoonEntity> {
    if (queryRunner) {
      return queryRunner.manager.save(moderationMovie);
    }
    return this.moderationCartoonEntity.save(moderationMovie);
  }

  async getModerationByIdWithMovieAndAdminInfo(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ModerationCartoonEntity | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.moderationCartoonEntity.target, {
        where: { id },
        relations: { movie: true, admin: true },
      });
    }
    return this.moderationCartoonEntity.findOne({
      where: { id },
      relations: { movie: true, admin: true },
    });
  }

  async removeTask(task: ModerationCartoonEntity, queryRunner?: QueryRunner): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.remove(task);
      return;
    }
    await this.moderationCartoonEntity.remove(task);
  }

  async getAllModeration(): Promise<ModerationCartoonEntity[]> {
    return this.moderationCartoonEntity.find();
  }
}
