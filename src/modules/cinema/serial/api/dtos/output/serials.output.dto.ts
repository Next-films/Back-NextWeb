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

type GroupedEpisodeVariants = {
  primary: SerialEpisode;
  variants: SerialEpisode[];
};

class SerialEpisodeOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty()
  previewUrl: string;

  @ApiProperty({ nullable: true })
  seasonNumber: number | null;

  @ApiProperty({ nullable: true })
  episodeNumber: number | null;

  @ApiProperty({ nullable: true })
  voiceoverLabel: string | null;
}

class SerialEpisodeVoiceoverOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  videoUrl: string;

  @ApiProperty({ nullable: true })
  voiceoverLabel: string | null;
}

class SerialEpisodeFilmOutputDto extends SerialEpisodeOutputDto {
  @ApiProperty()
  videoUrl: string;

  @ApiProperty({ type: SerialEpisodeVoiceoverOutputDto, isArray: true })
  voiceovers: SerialEpisodeVoiceoverOutputDto[];
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
    const loadedEpisodes = serial.episodes || [];
    const episodeCount =
      loadedEpisodes.length > 0
        ? this.countUniqueEpisodes(loadedEpisodes)
        : relationEpisodeCount ?? 0;

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
      episodeCount,
    };
  }

  mapSerials(serials: Serial[]): SerialsOutputDto[] {
    return serials.map(s => this.mapSerial(s));
  }

  mapSpecifySerial(serial: Serial): SpecifySerialsOutputDto {
    const topLevelGroups = this.groupEpisodeVariants(serial.episodes || []);
    const episodes = topLevelGroups.map(group => this.mapEpisode(group.primary));
    const films = topLevelGroups.map(group =>
      this.mapEpisodeFilmWithVariants(group.primary, group.variants),
    );
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
      episodeNumber: episode.episodeNumber ?? this.extractEpisodeNumber(episode.title),
      voiceoverLabel: episode.voiceoverLabel || null,
    };
  }

  mapEpisodeFilm(episode: SerialEpisode): SerialEpisodeFilmOutputDto {
    return this.mapEpisodeFilmWithVariants(episode, [episode]);
  }

  private mapEpisodeFilmWithVariants(
    episode: SerialEpisode,
    variants: SerialEpisode[],
  ): SerialEpisodeFilmOutputDto {
    const voiceovers = variants.map(variant => ({
      id: variant.id,
      videoUrl: variant.videoUrl,
      voiceoverLabel: variant.voiceoverLabel || null,
    }));

    return {
      ...this.mapEpisode(episode),
      videoUrl: episode.videoUrl,
      voiceovers,
    };
  }

  private mapSeason(season: SerialSeason): SerialSeasonOutputDto {
    const grouped = this.groupEpisodeVariants(season.episodes || [], season.seasonNumber);
    const episodes = grouped.map(group =>
      this.mapSeasonEpisode(group.primary, season.seasonNumber),
    );
    const films = grouped.map(group =>
      this.mapSeasonEpisodeFilmWithVariants(group.primary, group.variants, season.seasonNumber),
    );

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

  private mapSeasonEpisodeFilmWithVariants(
    episode: SerialEpisode,
    variants: SerialEpisode[],
    seasonNumber: number,
  ): SerialEpisodeFilmOutputDto {
    return {
      ...this.mapEpisodeFilmWithVariants(episode, variants),
      seasonNumber,
    };
  }

  private countUniqueEpisodes(episodes: SerialEpisode[]): number {
    return this.groupEpisodeVariants(episodes).length;
  }

  private groupEpisodeVariants(
    episodes: SerialEpisode[],
    fallbackSeasonNumber?: number,
  ): GroupedEpisodeVariants[] {
    const groups = new Map<string, SerialEpisode[]>();
    const orderedKeys: string[] = [];

    for (const episode of episodes) {
      const seasonNumber = episode.season?.seasonNumber ?? fallbackSeasonNumber ?? 1;
      const episodeNumber = episode.episodeNumber ?? this.extractEpisodeNumber(episode.title);
      const titleKey = (episode.title || '').trim().toLowerCase() || `id-${episode.id}`;
      const episodeKey = episodeNumber ? `ep-${episodeNumber}` : `title-${titleKey}`;
      const key = `${seasonNumber}:${episodeKey}`;

      if (!groups.has(key)) {
        groups.set(key, []);
        orderedKeys.push(key);
      }

      groups.get(key)!.push(episode);
    }

    const sortedKeys = [...orderedKeys].sort((a, b) => this.compareGroupKeys(a, b));

    return sortedKeys
      .map(key => {
        const variants = [...(groups.get(key) || [])].sort((a, b) => this.compareVariants(a, b));
        const primary = variants[0];
        if (!primary) return null;

        return { primary, variants };
      })
      .filter((value): value is GroupedEpisodeVariants => Boolean(value));
  }

  private compareGroupKeys(a: string, b: string): number {
    const aDelimiter = a.indexOf(':');
    const bDelimiter = b.indexOf(':');
    const aSeasonRaw = aDelimiter >= 0 ? a.slice(0, aDelimiter) : a;
    const bSeasonRaw = bDelimiter >= 0 ? b.slice(0, bDelimiter) : b;
    const aEpisodeRaw = aDelimiter >= 0 ? a.slice(aDelimiter + 1) : '';
    const bEpisodeRaw = bDelimiter >= 0 ? b.slice(bDelimiter + 1) : '';
    const aSeason = Number.parseInt(aSeasonRaw, 10);
    const bSeason = Number.parseInt(bSeasonRaw, 10);

    if (aSeason !== bSeason) {
      return aSeason - bSeason;
    }

    const aEpisode = aEpisodeRaw.startsWith('ep-')
      ? Number.parseInt(aEpisodeRaw.slice(3), 10)
      : Number.MAX_SAFE_INTEGER;
    const bEpisode = bEpisodeRaw.startsWith('ep-')
      ? Number.parseInt(bEpisodeRaw.slice(3), 10)
      : Number.MAX_SAFE_INTEGER;

    if (aEpisode !== bEpisode) {
      return aEpisode - bEpisode;
    }

    return aEpisodeRaw.localeCompare(bEpisodeRaw, undefined, { numeric: true });
  }

  private compareVariants(a: SerialEpisode, b: SerialEpisode): number {
    const aLabel = (a.voiceoverLabel || '').trim().toLowerCase();
    const bLabel = (b.voiceoverLabel || '').trim().toLowerCase();

    if (aLabel !== bLabel) {
      return aLabel.localeCompare(bLabel, undefined, { numeric: true });
    }

    return a.id - b.id;
  }

  private extractEpisodeNumber(title: string | null | undefined): number | null {
    if (!title) return null;
    const match = title.match(/(\d{1,4})/);
    if (!match) return null;
    const parsed = Number.parseInt(match[1], 10);

    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }
}
