import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieDurationUtil } from '@/common/utils/movie-duration.util';
import { Genre } from '@/movies/domain/genre.entity';
import { MovieAvailabilityPolicy } from '@/movies/domain/movie-availability.policy';
import { MovieAvailabilityStatus } from '@/movies/domain/types';

export class MovieGenreOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

class MoviePublicContentOutputDto {
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

/*
 *
 *  For list of films
 *
 */
export class MoviesPublicOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  previewUrl: string | null;

  @ApiProperty({ nullable: true })
  cardImg: string | null;

  @ApiProperty({ nullable: true })
  releaseDate: string | null;

  @ApiProperty({ type: MovieGenreOutputDto, isArray: true })
  genres: MovieGenreOutputDto[];

  @ApiProperty({ nullable: true })
  universe: string | null;

  @ApiProperty({ nullable: true })
  studio: string | null;

  @ApiProperty({ enum: MovieAvailabilityStatus })
  availabilityStatus: MovieAvailabilityStatus;

  @ApiProperty()
  isPlayable: boolean;

  @ApiProperty({ nullable: true })
  unavailableReason: string | null;
}
/*
 *
 *  For specify film by id
 *
 */
export class MoviePublicOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: MoviePublicContentOutputDto })
  content: MoviePublicContentOutputDto;

  @ApiProperty({ nullable: true })
  subTitle: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  releaseDate: string | null;

  @ApiProperty()
  duration: number;

  @ApiProperty({ type: MovieGenreOutputDto, isArray: true })
  genres: MovieGenreOutputDto[];

  @ApiProperty({ nullable: true })
  country: string[] | null;

  @ApiProperty({ nullable: true })
  universe: string | null;

  @ApiProperty({ nullable: true })
  studio: string | null;

  @ApiProperty({ enum: MovieAvailabilityStatus })
  availabilityStatus: MovieAvailabilityStatus;

  @ApiProperty()
  isPlayable: boolean;

  @ApiProperty({ nullable: true })
  unavailableReason: string | null;
}

@Injectable()
export class MoviePublicOutputDtoMapper {
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
  /*
   *
   *  Map specify film
   *
   */
  mapMovie(movie: MovieEntity): MoviePublicOutputDto {
    const genres = movie.genres ?? [];

    const {
      id,
      title,
      releaseDate,
      description,
      backgroundContentUrl,
      previewUrl,
      trailerUrl,
      country,
      duration,
      titleUrl,
      videoUrl,
      universe,
      studio,
    } = movie;
    const availabilityStatus = MovieAvailabilityPolicy.resolveStatus(movie);
    const isPlayable = MovieAvailabilityPolicy.isPlayable(movie);

    return {
      id,
      name: title,

      content: {
        movieUrl: isPlayable ? videoUrl : null,
        backgroundUrl: backgroundContentUrl,
        previewUrl,
        titleUrl,
        trailerUrl: trailerUrl,
      },

      releaseDate,
      description,
      subTitle: releaseDate
        ? this.mapSubtitle(releaseDate, this.formatGenresString(genres), duration)
        : null,
      genres: this.mapMovieGenres(genres),
      country: country,
      duration: duration,
      universe,
      studio,
      availabilityStatus,
      isPlayable,
      unavailableReason: MovieAvailabilityPolicy.getUnavailableReason(movie),
    };
  }

  mapMovies(movies: MovieEntity[]): MoviePublicOutputDto[] {
    return movies.map(m => this.mapMovie(m));
  }
  /*
   *
   *  Map list of films
   *
   */
  mapAllPublicMovie(movie: MovieEntity): MoviesPublicOutputDto {
    const { id, title, releaseDate, previewUrl, genres, universe, studio } = movie;
    const availabilityStatus = MovieAvailabilityPolicy.resolveStatus(movie);

    return {
      id,
      name: title,
      previewUrl,
      cardImg: previewUrl,
      releaseDate,
      genres: this.mapMovieGenres(genres),
      universe,
      studio,
      availabilityStatus,
      isPlayable: MovieAvailabilityPolicy.isPlayable(movie),
      unavailableReason: MovieAvailabilityPolicy.getUnavailableReason(movie),
    };
  }

  mapAllPublicMovies(movies: MovieEntity[]): MoviesPublicOutputDto[] {
    return movies.map(m => this.mapAllPublicMovie(m));
  }
}
