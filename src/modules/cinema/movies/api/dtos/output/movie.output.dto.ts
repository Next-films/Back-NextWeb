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

  @ApiProperty({ nullable: true })
  trailerUrl: string | null;

  @ApiProperty({ nullable: true })
  backgroundImg: string | null;

  @ApiProperty({ nullable: true })
  cardImg: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  subTitle: string | null;

  @ApiProperty({ nullable: true })
  titleImg: string | null;

  @ApiProperty({ nullable: true })
  releaseDate: string | null;

  @ApiProperty({ type: MovieGenreOutputDto, isArray: true })
  genres: MovieGenreOutputDto[];

  @ApiProperty()
  duration: number;

  @ApiProperty({ nullable: true })
  country: string[] | null;
}

@Injectable()
export class MovieOutputDtoMapper {
  private mapSubtitle(releaseDate: string, genres: string, duration: number): string {
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

    const {
      id,
      title,
      releaseDate,
      description,
      backgroundImg,
      cardImg,
      trailerUrl,
      country,
      duration,
      titleImg,
    } = movie;
    return {
      id: id,
      title: title,
      backgroundImg: backgroundImg,
      releaseDate: releaseDate,
      cardImg: cardImg,
      description: description,
      trailerUrl: trailerUrl,
      subTitle: releaseDate
        ? this.mapSubtitle(releaseDate, this.formatGenresString(genres), duration)
        : null,
      titleImg: titleImg,
      genres: this.mapMovieGenres(genres),
      country: country,
      duration: duration,
    };
  }

  mapMovies(movies: MovieEntity[]): MovieOutputDto[] {
    return movies.map(m => this.mapMovie(m));
  }
}
