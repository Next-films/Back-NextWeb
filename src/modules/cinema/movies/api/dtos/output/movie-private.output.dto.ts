import { MovieHandleStatus } from '@/movies/domain/types';
import { Injectable } from '@nestjs/common';
import { MovieEntity } from '@/movies/domain/movie.entity';

export class MoviePrivateOutputDto {
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
export class MoviePrivateOutputDtoMapper {
  mapMovie(movie: MovieEntity): MoviePrivateOutputDto {
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

  mapMovies(movie: MovieEntity[]): MoviePrivateOutputDto[] {
    return movie.map(m => this.mapMovie(m));
  }
}
