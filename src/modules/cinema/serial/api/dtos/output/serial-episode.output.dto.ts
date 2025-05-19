import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';

export class SerialEpisodeOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  previewUrl: string;

  @ApiProperty()
  releaseDate: Date;

  @ApiProperty()
  duration: number;
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
    };
  }

  mapEpisodes(episodes: SerialEpisode[]): SerialEpisodeOutputDto[] {
    return episodes.map(s => this.mapEpisode(s));
  }
}
