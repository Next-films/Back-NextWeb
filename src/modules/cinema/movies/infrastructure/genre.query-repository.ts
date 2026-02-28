import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { ILike, Repository } from 'typeorm';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';

@Injectable()
export class GenreQueryRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async getById(id: number): Promise<Genre | null> {
    return this.genreRepository.findOne({ where: { id } });
  }

  async getGenres(skip: number, take: number, searchName: string | null): Promise<Genre[] | null> {
    const where = searchName ? { name: ILike(`%${searchName}%`) } : {};

    return this.genreRepository.find({ where, take, skip, order: { name: SortDirectionEnum.ASC } });
  }

  async getGenresCount(searchName: string | null): Promise<number> {
    const where = searchName ? { name: ILike(`%${searchName}%`) } : {};
    return this.genreRepository.count({
      where,
    });
  }
}
