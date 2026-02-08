import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';

export class SerialEpisodeOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  previewUrl: string;

  @ApiProperty()
  releaseDate: Date;

  @ApiProperty()
  duration: number;

  @ApiProperty({ nullable: true })
  seasonNumber: number | null;
}

@Injectable()
export class SerialEpisodesOutputDtoMapper {
  mapEpisode(episode: SerialEpisode): SerialEpisodeOutputDto {
    return {
      id: episode.id,
      title: episode.title,
      previewUrl: episode.previewUrl,
      releaseDate: episode.releaseDate,
      description: episode.description,
      duration: episode.duration,
      seasonNumber: episode.season?.seasonNumber ?? null,
    };
  }

  mapEpisodes(episodes: SerialEpisode[]): SerialEpisodeOutputDto[] {
    return episodes.map(s => this.mapEpisode(s));
  }
}
