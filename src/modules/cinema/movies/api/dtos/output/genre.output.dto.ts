import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { Genre } from '@/movies/domain/genre.entity';

export class GenreOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

@Injectable()
export class GenreOutputDtoMapper {
  mapGenre(genre: Genre): GenreOutputDto {
    const { id, name } = genre;
    return {
      id,
      name,
    };
  }

  mapGenres(genres: Genre[]): GenreOutputDto[] {
    return genres.map(g => this.mapGenre(g));
  }
}
