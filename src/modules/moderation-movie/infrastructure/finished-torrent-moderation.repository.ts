import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';

@Injectable()
export class FinishedTorrentModerationRepository {
  constructor(
    @InjectRepository(FinishedTorrentModerationEntity)
    private readonly finishedTorrentModerationEntity: Repository<FinishedTorrentModerationEntity>,
  ) {}

  async save(
    moderation: FinishedTorrentModerationEntity,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.save(moderation);
      return;
    }
    await this.finishedTorrentModerationEntity.save(moderation);
  }

  async getByKpId(
    kpId: string,
    queryRunner?: QueryRunner,
  ): Promise<FinishedTorrentModerationEntity | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.finishedTorrentModerationEntity.target, {
        where: { kpId },
      });
    }
    return this.finishedTorrentModerationEntity.findOne({ where: { kpId } });
  }
}
