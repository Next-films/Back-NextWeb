import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieDurationUtil } from '@/common/utils/movie-duration.util';

export class MovieOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  trailerUrl: string;

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
  private mapSubtitle(releaseDate: Date, genres: string[], duration: number): string {
    const date = new Date(releaseDate);
    const year = date.getFullYear();

    const genreString = genres.join('/');
    const durationString = MovieDurationUtil.formatDuration(duration);

    return `${year} г. ‧ ${genreString} ‧ ${durationString}`;
  }

  mapMovie(movie: MovieEntity): MovieOutputDto {
    const genres = movie.genres?.map(g => g.name.charAt(0).toUpperCase() + g.name.slice(1)) || [];

    return {
      id: movie.id,
      title: movie.title,
      backgroundImg: movie.backgroundImg,
      releaseDate: movie.releaseDate,
      cardImg: movie.cardImg,
      description: movie.description,
      trailerUrl: movie.trailerUrl,
      subTitle: this.mapSubtitle(movie.releaseDate, genres, movie.duration),
      titleImg: movie.titleImg,
      genres,
      country: movie.country,
      duration: movie.duration,
    };
  }

  mapMovies(movies: MovieEntity[]): MovieOutputDto[] {
    return movies.map(m => this.mapMovie(m));
  }
}
