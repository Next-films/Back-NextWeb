import { Injectable } from '@nestjs/common';
import {
  MovieGenreOutputDto,
  MovieOutputDtoMapper,
} from '@/movies/api/dtos/output/movie.output.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';

export class SerialsOutputDto {
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
  country: string[];

  @ApiProperty()
  episodeCount: number;
}

class SerialEpisodeOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  previewUrl: string;
}

export class SpecifySerialsOutputDto extends SerialsOutputDto {
  @ApiProperty({ type: SerialEpisodeOutputDto, isArray: true })
  episodes: SerialEpisodeOutputDto[];
}

@Injectable()
export class SerialsOutputDtoMapper extends MovieOutputDtoMapper {
  private mapSerialSubtitle(releaseDate: Date, genres: string, episodesCount: number): string {
    const date = new Date(releaseDate);
    const year = date.getFullYear();

    return `${year} г. ‧ ${genres} ‧ ${episodesCount} серий`;
  }

  mapSerial(serial: Serial): SerialsOutputDto {
    const genres = serial.genres ?? [];
    const episodeCount = serial.episodes?.length || 0;
    return {
      id: serial.id,
      title: serial.title,
      backgroundImg: serial.backgroundImg,
      releaseDate: serial.releaseDate,
      cardImg: serial.cardImg,
      description: serial.description,
      trailerUrl: serial.trailerUrl,
      subTitle: this.mapSerialSubtitle(
        serial.releaseDate,
        this.formatGenresString(genres),
        episodeCount,
      ),
      titleImg: serial.titleImg,
      genres: this.mapMovieGenres(genres),
      country: serial.country,
      episodeCount: episodeCount,
    };
  }

  mapSerials(serials: Serial[]): SerialsOutputDto[] {
    return serials.map(s => this.mapSerial(s));
  }

  mapSpecifySerial(serial: Serial): SpecifySerialsOutputDto {
    return {
      ...this.mapSerial(serial),
      episodes: serial.episodes.map(e => this.mapEpisode(e)),
    };
  }

  mapEpisode(episode: SerialEpisode): SerialEpisodeOutputDto {
    return {
      id: episode.id,
      title: episode.title,
      previewUrl: episode.previewUrl,
    };
  }
}
