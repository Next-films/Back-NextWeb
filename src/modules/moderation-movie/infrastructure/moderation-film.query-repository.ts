import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Not, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import {
  ModerationMovieTaskSortFiledEnum,
  ModerationMovieTypeStatusEnum,
} from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';

@Injectable()
export class ModerationFilmQueryRepository {
  constructor(
    @InjectRepository(ModerationFilmEntity)
    private readonly moderationFilmEntity: Repository<ModerationFilmEntity>,
  ) {}

  private getSearchFilmTasksClause(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): FindOptionsWhere<ModerationFilmEntity> {
    const where: FindOptionsWhere<ModerationFilmEntity> = {};

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

  async getFilmTasks(
    sortField: ModerationMovieTaskSortFiledEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    take: number,
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<ModerationFilmEntity[] | null> {
    const where = this.getSearchFilmTasksClause(searchMovieName, status);

    const result = await this.moderationFilmEntity.find({
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

  async getFilmTasksCount(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<number> {
    const where = this.getSearchFilmTasksClause(searchMovieName, status);
    const result = await this.moderationFilmEntity.count({ where });
    return result || 0;
  }

  async getFilmTaskByIdWithMovieInfo(id: number): Promise<ModerationFilmEntity | null> {
    return this.moderationFilmEntity.findOne({
      where: { id },
      relations: { movie: true, admin: { adminTelegram: true } },
    });
  }
}
