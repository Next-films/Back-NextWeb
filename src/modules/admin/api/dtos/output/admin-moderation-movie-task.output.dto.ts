import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';
import { Admin } from '@/admin/domain/admin.entity';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieGenreOutputDto } from '@/movies/api/dtos/output/movie-public.output.dto';
import {
  FindTorApiTorrentFilmType,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';

/*
 *
 * Admin output data
 *
 */
class AdminModerationMovieTaskAdminOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  tgId: string | null;

  @ApiProperty({ nullable: true })
  tgUsername: string | null;
}
/*
 *
 * Movie output data
 *
 */
class AdminModerationMovieTaskMovieOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

class AdminModerationMovieTaskMovieByIdContentOutputDto {
  @ApiProperty({ nullable: true })
  titleUrl: string | null;

  @ApiProperty({ nullable: true })
  backgroundContentUrl: string | null;

  @ApiProperty({ nullable: true })
  previewUrl: string | null;

  @ApiProperty({ nullable: true })
  trailerUrl: string | null;

  @ApiProperty({ nullable: true })
  videoUrl: string | null;
}

class AdminModerationMovieTaskMovieByIdOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  kpId: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  alternativeTitles: string | null;

  @ApiProperty({ nullable: true })
  originalTitle: string | null;

  @ApiProperty({ type: AdminModerationMovieTaskMovieByIdContentOutputDto })
  content: AdminModerationMovieTaskMovieByIdContentOutputDto;

  @ApiProperty({ nullable: true })
  releaseDate: string | null;

  @ApiProperty({ description: 'Value in seconds' })
  duration: number;

  @ApiProperty({ type: MovieGenreOutputDto, isArray: true })
  genres: MovieGenreOutputDto[];

  @ApiProperty({ isArray: true, nullable: true })
  country: string[] | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;
}
/*
 *
 * Torrent output data
 *
 */
class AdminModerationMovieTaskByIdTorrentOutputDto {
  @ApiProperty({ enum: TorApiProvidersEnum })
  provider: TorApiProvidersEnum;

  @ApiProperty()
  providerId: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  originalName: string | null;

  @ApiProperty({ nullable: true })
  fileSize: string | null;

  @ApiProperty({ nullable: true })
  kpId: string | null;

  @ApiProperty({ nullable: true })
  imdbId: string | null;

  @ApiProperty({ nullable: true })
  kinopoiskUrl: string | null;

  @ApiProperty({ nullable: true })
  imdbUrl: string | null;

  @ApiProperty({ nullable: true })
  torrentUrl: string | null;
}
/*
 *
 * Base output data
 *
 */
export class AdminModerationMovieTaskOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  acceptedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: AdminModerationMovieTaskAdminOutputDto, nullable: true })
  admin: AdminModerationMovieTaskAdminOutputDto | null;

  @ApiProperty({ type: AdminModerationMovieTaskMovieOutputDto })
  movie: AdminModerationMovieTaskMovieOutputDto;
}

export class AdminModerationMovieTaskByIdOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  acceptedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: AdminModerationMovieTaskAdminOutputDto, nullable: true })
  admin: AdminModerationMovieTaskAdminOutputDto | null;

  @ApiProperty({ type: AdminModerationMovieTaskMovieByIdOutputDto })
  movie: AdminModerationMovieTaskMovieByIdOutputDto;

  @ApiProperty({
    type: AdminModerationMovieTaskByIdTorrentOutputDto,
    isArray: true,
    nullable: true,
  })
  torrent: AdminModerationMovieTaskByIdTorrentOutputDto[] | null;
}
/*
 *
 * Mapper
 *
 */
@Injectable()
export class AdminModerationMovieTaskOutputDtoMapper {
  private mapAdmin(admin: Admin | null): AdminModerationMovieTaskAdminOutputDto | null {
    if (!admin) return null;

    const { adminTelegram, id } = admin;
    return {
      id,
      tgUsername: adminTelegram?.username || null,
      tgId: adminTelegram?.telegramId || null,
    };
  }

  private mapTorrentData(
    torrent: TorApiMovieById & { provider: TorApiProvidersEnum },
  ): AdminModerationMovieTaskByIdTorrentOutputDto {
    const {
      provider,
      Id,
      Original_Name,
      Name,
      Url,
      Description,
      IMDb_id,
      IMDb_link,
      Kinopoisk_link,
      Kinopoisk_id,
      Size,
    } = torrent;

    return {
      provider,
      providerId: Id,
      name: Name || null,
      originalName: Original_Name || null,
      description: Description || null,
      imdbId: IMDb_id || null,
      kpId: Kinopoisk_id || null,
      imdbUrl: IMDb_link || null,
      kinopoiskUrl: Kinopoisk_link || null,
      fileSize: Size || null,
      torrentUrl: Url || null,
    };
  }
  private mapTorrent(
    torrent: FindTorApiTorrentFilmType | null,
  ): AdminModerationMovieTaskByIdTorrentOutputDto[] | null {
    if (!torrent) return null;

    const { RuTor, RuTracker, Kinozal, NoNameClub } = torrent;

    const allTorrents = [
      ...(RuTor ?? []).map(t => ({ ...t, provider: TorApiProvidersEnum.RUTOR })),
      ...(RuTracker ?? []).map(t => ({ ...t, provider: TorApiProvidersEnum.RUTRACKER })),
      ...(Kinozal ?? []).map(t => ({ ...t, provider: TorApiProvidersEnum.KINOZAL })),
      ...(NoNameClub ?? []).map(t => ({ ...t, provider: TorApiProvidersEnum.NONAMECLUB })),
    ];

    return allTorrents.map(t => this.mapTorrentData(t));
  }

  private mapMovie<T extends MovieEntity>(movie: T): AdminModerationMovieTaskMovieOutputDto {
    const { id, title } = movie;
    return {
      id,
      name: title,
    };
  }

  private mapMovieByIdContent<T extends MovieEntity>(
    movie: T,
  ): AdminModerationMovieTaskMovieByIdContentOutputDto {
    const { titleUrl, backgroundContentUrl, previewUrl, trailerUrl, videoUrl } = movie;

    return {
      titleUrl,
      backgroundContentUrl,
      previewUrl,
      trailerUrl,
      videoUrl,
    };
  }

  private mapMovieById<T extends MovieEntity>(
    movie: T,
  ): AdminModerationMovieTaskMovieByIdOutputDto {
    const {
      id,
      title,
      alternativeTitles,
      originalTitle,
      releaseDate,
      createdAt,
      duration,
      genres,
      updatedAt,
      kpId,
      country,
      description,
    } = movie;
    return {
      id,
      name: title,
      alternativeTitles,
      originalTitle,
      releaseDate,
      createdAt,
      duration,
      genres,
      updatedAt,
      kpId,
      country,
      description,
      content: this.mapMovieByIdContent(movie),
    };
  }

  mapTask<T extends ModerationMovieEntity>(task: T): AdminModerationMovieTaskOutputDto {
    const { admin, id, createdAt, acceptAt, movie } = task;
    return {
      id,
      acceptedAt: acceptAt || null,
      createdAt: createdAt,
      admin: this.mapAdmin(admin),
      movie: this.mapMovie(movie),
    };
  }

  mapTasks<T extends ModerationMovieEntity>(tasks: T[]): AdminModerationMovieTaskOutputDto[] {
    return tasks.map(t => this.mapTask(t));
  }

  mapTaskById<T extends ModerationMovieEntity>(task: T): AdminModerationMovieTaskByIdOutputDto {
    const { admin, id, createdAt, acceptAt, movie, torrentData } = task;
    return {
      id,
      acceptedAt: acceptAt || null,
      createdAt: createdAt,
      admin: this.mapAdmin(admin),
      movie: this.mapMovieById(movie),
      torrent: this.mapTorrent(torrentData),
    };
  }
}
