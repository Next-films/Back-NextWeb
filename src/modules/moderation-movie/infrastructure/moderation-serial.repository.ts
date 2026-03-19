import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';

@Injectable()
export class ModerationSerialRepository {
  constructor(
    @InjectRepository(ModerationSerialEntity)
    private readonly moderationSerialEntity: Repository<ModerationSerialEntity>,
  ) {}

  async save(
    moderationMovie: ModerationSerialEntity,
    queryRunner?: QueryRunner,
  ): Promise<ModerationSerialEntity> {
    if (queryRunner) {
      return queryRunner.manager.save(moderationMovie);
    }
    return this.moderationSerialEntity.save(moderationMovie);
  }

  async getModerationByMovieId(
    movieId: number,
    queryRunner?: QueryRunner,
  ): Promise<ModerationSerialEntity | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.moderationSerialEntity.target, {
        where: { movieId },
      });
    }
    return this.moderationSerialEntity.findOne({ where: { movieId } });
  }

  async getModerationByIdWithMovieAndAdminInfo(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ModerationSerialEntity | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.moderationSerialEntity.target, {
        where: { id: id },
        relations: { movie: { genres: true }, admin: { adminTelegram: true } },
      });
    }
    return this.moderationSerialEntity.findOne({
      where: { id },
      relations: { movie: { genres: true }, admin: { adminTelegram: true } },
    });
  }

  async removeTask(task: ModerationSerialEntity, queryRunner?: QueryRunner): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.remove(task);
      return;
    }
    await this.moderationSerialEntity.remove(task);
  }

  async getAllModeration(): Promise<ModerationSerialEntity[]> {
    return this.moderationSerialEntity.find();
  }
}
