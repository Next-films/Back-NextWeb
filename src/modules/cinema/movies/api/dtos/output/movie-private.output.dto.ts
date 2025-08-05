import { MovieHandleStatus } from '@/movies/domain/types';
import { Injectable } from '@nestjs/common';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { ApiProperty } from '@nestjs/swagger';

export class MoviePrivateOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  kpId: string;

  @ApiProperty()
  name: string | null;

  @ApiProperty()
  videoUrl: string | null;

  @ApiProperty()
  isHidden: boolean;

  @ApiProperty({ enum: MovieHandleStatus })
  handleStatus: MovieHandleStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
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
