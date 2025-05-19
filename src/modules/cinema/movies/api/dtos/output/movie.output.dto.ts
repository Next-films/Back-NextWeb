import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieDurationUtil } from '@/common/utils/movie-duration.util';
import { Genre } from '@/movies/domain/genre.entity';

export class MovieGenreOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

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

  @ApiProperty({ type: MovieGenreOutputDto, isArray: true })
  genres: MovieGenreOutputDto[];

  @ApiProperty()
  duration: number;

  @ApiProperty()
  country: string[];
}

@Injectable()
export class MovieOutputDtoMapper {
  private mapSubtitle(releaseDate: Date, genres: string, duration: number): string {
    const date = new Date(releaseDate);
    const year = date.getFullYear();

    const durationString = MovieDurationUtil.formatDuration(duration);

    return `${year} г. ‧ ${genres} ‧ ${durationString}`;
  }

  protected mapMovieGenres(genres: Genre[] = []): MovieGenreOutputDto[] {
    return genres.map(({ id, name }) => ({ id, name }));
  }

  protected formatGenresString(genres: Genre[] = []): string {
    return genres.map(g => g.name.charAt(0).toUpperCase() + g.name.slice(1)).join('/');
  }

  mapMovie(movie: MovieEntity): MovieOutputDto {
    const genres = movie.genres ?? [];

    return {
      id: movie.id,
      title: movie.title,
      backgroundImg: movie.backgroundImg,
      releaseDate: movie.releaseDate,
      cardImg: movie.cardImg,
      description: movie.description,
      trailerUrl: movie.trailerUrl,
      subTitle: this.mapSubtitle(
        movie.releaseDate,
        this.formatGenresString(genres),
        movie.duration,
      ),
      titleImg: movie.titleImg,
      genres: this.mapMovieGenres(genres),
      country: movie.country,
      duration: movie.duration,
    };
  }

  mapMovies(movies: MovieEntity[]): MovieOutputDto[] {
    return movies.map(m => this.mapMovie(m));
  }
}
