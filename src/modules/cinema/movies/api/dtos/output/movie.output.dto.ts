import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { MovieEntity } from '@/movies/domain/movie.entity';

export class MovieOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  originalTitle: string;

  @ApiProperty()
  trailerUrl: string;

  @ApiProperty()
  alternativeTitles: string;

  @ApiProperty()
  backgroundImg: string;

  @ApiProperty()
  cardImg: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  subTitle: string;

  @ApiProperty()
  titleImg: string;

  @ApiProperty()
  releaseDate: Date;

  @ApiProperty()
  genres: string[];

  @ApiProperty()
  duration: number;

  @ApiProperty()
  country: string[];
}

@Injectable()
export class MovieOutputDtoMapper {
  mapMovie(movie: MovieEntity): MovieOutputDto {
    return {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      backgroundImg: movie.backgroundImg,
      alternativeTitles: movie.alternativeTitles,
      releaseDate: movie.releaseDate,
      cardImg: movie.cardImg,
      description: movie.description,
      trailerUrl: movie.trailerUrl,
      subTitle: movie.subTitle,
      titleImg: movie.titleImg,
      genres: movie.genres?.map(g => g.name) || [],
      country: movie.country,
      duration: movie.duration,
    };
  }

  mapMovies(movies: MovieEntity[]): MovieOutputDto[] {
    return movies.map(m => this.mapMovie(m));
  }
}
