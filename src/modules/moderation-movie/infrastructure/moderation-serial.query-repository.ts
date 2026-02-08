import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Not, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  ModerationMovieTaskSortFiledEnum,
  ModerationMovieTypeStatusEnum,
} from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';

@Injectable()
export class ModerationSerialQueryRepository {
  constructor(
    @InjectRepository(ModerationSerialEntity)
    private readonly moderationSerialEntity: Repository<ModerationSerialEntity>,
  ) {}

  private getSearchSerialTasksClause(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): FindOptionsWhere<ModerationSerialEntity> {
    const where: FindOptionsWhere<ModerationSerialEntity> = {};

    if (status === ModerationMovieTypeStatusEnum.PENDING) {
      where.acceptAt = IsNull();
    } else if (status === ModerationMovieTypeStatusEnum.ACCEPTED) {
      where.acceptAt = Not(IsNull());
    }

    if (searchMovieName) {
      where.movie = {
        title: ILike(`%${searchMovieName}%`),
      };
    }

    return where;
  }

  async getSerialTasks(
    sortField: ModerationMovieTaskSortFiledEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<ModerationSerialEntity[] | null> {
    const where = this.getSearchSerialTasksClause(searchMovieName, status);

    const result = await this.moderationSerialEntity.find({
      where,
      relations: { movie: true, admin: { adminTelegram: true } },
      order: {
        [sortField]: sortDirection,
      },
      skip,
      take,
    });

    return result && result.length > 0 ? result : null;
  }

  async getSerialTasksCount(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<number> {
    const where = this.getSearchSerialTasksClause(searchMovieName, status);
    const result = await this.moderationSerialEntity.count({ where });
    return result || 0;
  }

  async getSerialTaskByIdWithMovieInfo(id: number): Promise<ModerationSerialEntity | null> {
    return this.moderationSerialEntity.findOne({
      where: { id },
      relations: { movie: true, admin: { adminTelegram: true } },
    });
  }
}
