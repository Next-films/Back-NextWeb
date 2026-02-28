import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Not, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  ModerationMovieTaskSortFiledEnum,
  ModerationMovieTypeStatusEnum,
} from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';

@Injectable()
export class ModerationCartoonQueryRepository {
  constructor(
    @InjectRepository(ModerationCartoonEntity)
    private readonly moderationCartoonEntity: Repository<ModerationCartoonEntity>,
  ) {}

  private getSearchCartoonTasksClause(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): FindOptionsWhere<ModerationCartoonEntity> {
    const where: FindOptionsWhere<ModerationCartoonEntity> = {};

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

  async getCartoonTasks(
    sortField: ModerationMovieTaskSortFiledEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<ModerationCartoonEntity[] | null> {
    const where = this.getSearchCartoonTasksClause(searchMovieName, status);

    const result = await this.moderationCartoonEntity.find({
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

  async getCartoonTasksCount(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<number> {
    const where = this.getSearchCartoonTasksClause(searchMovieName, status);
    const result = await this.moderationCartoonEntity.count({ where });
    return result || 0;
  }

  async getCartoonTaskByIdWithMovieInfo(id: number): Promise<ModerationCartoonEntity | null> {
    return this.moderationCartoonEntity.findOne({
      where: { id },
      relations: { movie: true, admin: { adminTelegram: true } },
    });
  }
}
