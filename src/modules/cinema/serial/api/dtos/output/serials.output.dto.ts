import { Injectable } from '@nestjs/common';
import {
  MovieGenreOutputDto,
  MoviePublicOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-public.output.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { SerialSeason } from '@/serials/domain/serial-season.entity';

export class SerialsOutputDto {
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

  @ApiProperty({ nullable: true })
  country: string[] | null;

  @ApiProperty()
  episodeCount: number;
}

class SerialEpisodeOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty()
  previewUrl: string;

  @ApiProperty({ nullable: true })
  seasonNumber: number | null;
}

class SerialEpisodeFilmOutputDto extends SerialEpisodeOutputDto {
  @ApiProperty()
  videoUrl: string;
}

class SerialSeasonOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  seasonNumber: number;

  @ApiProperty({ type: SerialEpisodeOutputDto, isArray: true })
  episodes: SerialEpisodeOutputDto[];

  @ApiProperty({ type: SerialEpisodeFilmOutputDto, isArray: true })
  films: SerialEpisodeFilmOutputDto[];
}

export class SpecifySerialsOutputDto extends SerialsOutputDto {
  @ApiProperty({ type: SerialEpisodeOutputDto, isArray: true })
  episodes: SerialEpisodeOutputDto[];

  @ApiProperty({ type: SerialEpisodeFilmOutputDto, isArray: true })
  films: SerialEpisodeFilmOutputDto[];

  @ApiProperty({ type: SerialSeasonOutputDto, isArray: true })
  seasons: SerialSeasonOutputDto[];
}

@Injectable()
export class SerialsOutputDtoMapper extends MoviePublicOutputDtoMapper {
  private mapSerialSubtitle(
    releaseDate: string | null,
    genres: string,
    episodesCount: number,
  ): string | null {
    if (!releaseDate) return null;

    const date = new Date(releaseDate);
    const year = date.getFullYear();

    return `${year} г. ‧ ${genres} ‧ ${episodesCount} серий`;
  }

  mapSerial(serial: Serial): SerialsOutputDto {
    const genres = serial.genres ?? [];
    const relationEpisodeCount = (serial as unknown as { episodesCount?: number }).episodesCount;
    const episodeCount = relationEpisodeCount ?? (serial.episodes?.length || 0);
    return {
      id: serial.id,
      title: serial.title,
      backgroundImg: serial.backgroundContentUrl,
      releaseDate: serial.releaseDate,
      cardImg: serial.previewUrl,
      description: serial.description,
      trailerUrl: serial.trailerUrl,
      subTitle: this.mapSerialSubtitle(
        serial.releaseDate,
        this.formatGenresString(genres),
        episodeCount,
      ),
      titleImg: serial.titleUrl,
      genres: this.mapMovieGenres(genres),
      country: serial.country,
      episodeCount: episodeCount,
    };
  }

  mapSerials(serials: Serial[]): SerialsOutputDto[] {
    return serials.map(s => this.mapSerial(s));
  }

  mapSpecifySerial(serial: Serial): SpecifySerialsOutputDto {
    const episodes = serial.episodes?.map(e => this.mapEpisode(e)) ?? [];
    const films = serial.episodes?.map(e => this.mapEpisodeFilm(e)) ?? [];
    const seasons = serial.seasons?.map(season => this.mapSeason(season)) ?? [];

    return {
      ...this.mapSerial(serial),
      episodes,
      films,
      seasons,
    };
  }

  mapEpisode(episode: SerialEpisode): SerialEpisodeOutputDto {
    return {
      id: episode.id,
      title: episode.title,
      previewUrl: episode.previewUrl,
      seasonNumber: episode.season?.seasonNumber ?? null,
    };
  }

  mapEpisodeFilm(episode: SerialEpisode): SerialEpisodeFilmOutputDto {
    return {
      ...this.mapEpisode(episode),
      videoUrl: episode.videoUrl,
    };
  }

  private mapSeason(season: SerialSeason): SerialSeasonOutputDto {
    const episodes = season.episodes?.map(e => this.mapSeasonEpisode(e, season.seasonNumber)) ?? [];
    const films =
      season.episodes?.map(e => this.mapSeasonEpisodeFilm(e, season.seasonNumber)) ?? [];

    return {
      id: season.id,
      seasonNumber: season.seasonNumber,
      episodes,
      films,
    };
  }

  private mapSeasonEpisode(episode: SerialEpisode, seasonNumber: number): SerialEpisodeOutputDto {
    return {
      ...this.mapEpisode(episode),
      seasonNumber,
    };
  }

  private mapSeasonEpisodeFilm(
    episode: SerialEpisode,
    seasonNumber: number,
  ): SerialEpisodeFilmOutputDto {
    return {
      ...this.mapEpisodeFilm(episode),
      seasonNumber,
    };
  }
}
