import { MovieHandleStatus } from '@/movies/domain/types';
import { Injectable } from '@nestjs/common';
import { MovieEntity } from '@/movies/domain/movie.entity';

export class MovieRpcOutputDto {
  id: number;
  kpId: string;
  name: string | null;
  videoUrl: string | null;
  isHidden: boolean;
  handleStatus: MovieHandleStatus;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MovieRpcOutputDtoMapper {
  mapMovie(movie: MovieEntity): MovieRpcOutputDto {
    const { id, kpId, title, videoUrl, isHidden, handleStatus, createdAt, updatedAt } = movie;

    return {
      id,
      kpId,
      name: title,
      videoUrl,
      isHidden,
      handleStatus,
      createdAt,
      updatedAt,
    };
  }

  mapMovies(movie: MovieEntity[]): MovieRpcOutputDto[] {
    return movie.map(m => this.mapMovie(m));
  }
}
