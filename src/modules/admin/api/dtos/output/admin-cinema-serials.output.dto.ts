import { Injectable } from '@nestjs/common';
import {
  AdminCinemaMoviesOutputDto,
  AdminCinemaMoviesOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-movies.output.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { MovieEntity } from '@/movies/domain/movie.entity';

class AdminCinemaSerialEpisodeOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty()
  seasonNumber: number;

  @ApiProperty()
  episodeNumber: number;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  videoUrl: string;

  @ApiProperty()
  releaseDate: Date;
}

export class AdminCinemaSerialsOutputDto extends AdminCinemaMoviesOutputDto {
  @ApiProperty({ type: AdminCinemaSerialEpisodeOutputDto, isArray: true })
  episodes: AdminCinemaSerialEpisodeOutputDto[];
}

@Injectable()
export class AdminCinemaSerialsOutputDtoMapper extends AdminCinemaMoviesOutputDtoMapper {
  private mapEpisodes(episodes: SerialEpisode[]): AdminCinemaSerialEpisodeOutputDto[] {
    const seasonCounters = new Map<number, number>();

    return [...episodes]
      .sort((a, b) => {
        const seasonA = a.season?.seasonNumber ?? 1;
        const seasonB = b.season?.seasonNumber ?? 1;
        if (seasonA !== seasonB) return seasonA - seasonB;
        return a.id - b.id;
      })
      .map(episode => {
        const seasonNumber = episode.season?.seasonNumber ?? 1;
        const nextEpisodeNumber = (seasonCounters.get(seasonNumber) ?? 0) + 1;
        seasonCounters.set(seasonNumber, nextEpisodeNumber);

        return {
          id: episode.id,
          title: episode.title ?? null,
          seasonNumber,
          episodeNumber: nextEpisodeNumber,
          duration: episode.duration,
          videoUrl: episode.videoUrl,
          releaseDate: episode.releaseDate,
        };
      });
  }

  mapMovie<T extends MovieEntity>(movie: T): AdminCinemaSerialsOutputDto {
    const base = super.mapMovie(movie);
    const serial = movie as unknown as Serial;

    return {
      ...base,
      episodes: this.mapEpisodes(serial.episodes ?? []),
    };
  }

  mapMovies<T extends MovieEntity>(movies: T[]): AdminCinemaSerialsOutputDto[] {
    return movies.map(movie => this.mapMovie(movie));
  }
}
