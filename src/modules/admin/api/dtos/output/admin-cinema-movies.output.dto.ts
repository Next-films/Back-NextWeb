import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieHandleStatus } from '@/movies/domain/types';
import { Genre } from '@/movies/domain/genre.entity';

class AdminCinemaMovieGenreOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

class AdminCinemaMoviesContentOutputDto {
  @ApiProperty({ nullable: true })
  movieUrl: string | null;

  @ApiProperty({ nullable: true })
  trailerUrl: string | null;

  @ApiProperty({ nullable: true })
  previewUrl: string | null;

  @ApiProperty({ nullable: true })
  backgroundUrl: string | null;

  @ApiProperty({ nullable: true })
  titleUrl: string | null;
}

export class AdminCinemaMoviesOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  kpId: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  isHidden: boolean;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  duration: number | null;

  @ApiProperty({ nullable: true })
  country: string[] | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;
  @ApiProperty({ type: AdminCinemaMovieGenreOutputDto, isArray: true })
  genres: AdminCinemaMovieGenreOutputDto[];

  @ApiProperty({ nullable: true })
  releaseDate: string | null;

  @ApiProperty({ nullable: true })
  originalTitle: string | null;

  @ApiProperty({ nullable: true })
  alternativeTitles: string | null;

  @ApiProperty({ nullable: true })
  universe: string | null;

  @ApiProperty({ nullable: true })
  studio: string | null;

  @ApiProperty({ enum: MovieHandleStatus })
  status: MovieHandleStatus;

  @ApiProperty({ type: AdminCinemaMoviesContentOutputDto })
  content: AdminCinemaMoviesContentOutputDto;
}

@Injectable()
export class AdminCinemaMoviesOutputDtoMapper {
  private mapGenre(genre: Genre): AdminCinemaMovieGenreOutputDto {
    const { id, name } = genre;

    return {
      id,
      name,
    };
  }

  private mapGenres(genres: Genre[]): AdminCinemaMovieGenreOutputDto[] {
    return genres.map(g => this.mapGenre(g));
  }

  private mapContent<T extends MovieEntity>(movie: T): AdminCinemaMoviesContentOutputDto {
    const { trailerUrl, previewUrl, backgroundContentUrl, titleUrl, videoUrl } = movie;
    return {
      movieUrl: videoUrl,
      backgroundUrl: backgroundContentUrl,
      previewUrl,
      titleUrl,
      trailerUrl,
    };
  }
  mapMovie<T extends MovieEntity>(movie: T): AdminCinemaMoviesOutputDto {
    const {
      id,
      handleStatus,
      kpId,
      description,
      country,
      updatedAt,
      genres,
      isHidden,
      duration,
      createdAt,
      releaseDate,
      originalTitle,
      title,
      alternativeTitles,
      universe,
      studio,
    } = movie;
    return {
      id,
      kpId,
      status: handleStatus,
      name: title,
      description,
      country,
      updatedAt,
      genres: this.mapGenres(genres),
      isHidden,
      duration,
      createdAt,
      releaseDate,
      originalTitle,
      alternativeTitles,
      universe,
      studio,
      content: this.mapContent(movie),
    };
  }

  mapMovies<T extends MovieEntity>(movies: T[]): AdminCinemaMoviesOutputDto[] {
    return movies.map(m => this.mapMovie(m));
  }
}
