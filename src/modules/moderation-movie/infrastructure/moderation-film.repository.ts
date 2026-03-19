import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';

@Injectable()
export class ModerationFilmRepository {
  constructor(
    @InjectRepository(ModerationFilmEntity)
    private readonly moderationFilmEntity: Repository<ModerationFilmEntity>,
  ) {}

  async save(
    moderationMovie: ModerationFilmEntity,
    queryRunner?: QueryRunner,
  ): Promise<ModerationFilmEntity> {
    if (queryRunner) {
      return queryRunner.manager.save(moderationMovie);
    }
    return this.moderationFilmEntity.save(moderationMovie);
  }

  async getModerationByMovieId(
    movieId: number,
    queryRunner?: QueryRunner,
  ): Promise<ModerationFilmEntity | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.moderationFilmEntity.target, { where: { movieId } });
    }
    return this.moderationFilmEntity.findOne({ where: { movieId } });
  }

  async getModerationByIdWithMovieAndAdminInfo(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ModerationFilmEntity | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.moderationFilmEntity.target, {
        where: { id: id },
        relations: { movie: { genres: true }, admin: { adminTelegram: true } },
      });
    }
    return this.moderationFilmEntity.findOne({
      where: { id },
      relations: { movie: { genres: true }, admin: { adminTelegram: true } },
    });
  }

  async removeTask(task: ModerationFilmEntity, queryRunner?: QueryRunner): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.remove(task);
      return;
    }
    await this.moderationFilmEntity.remove(task);
  }

  async getAllModeration(): Promise<ModerationFilmEntity[]> {
    return this.moderationFilmEntity.find();
  }
}
