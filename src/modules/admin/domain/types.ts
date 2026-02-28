import {
  ModerationMovieTaskSortFiledEnum,
  ModerationMovieTypeStatusEnum,
} from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartonCreateDto } from '@/cartoons/domain/types';
import { FilmCreateDto } from '@/films/domain/types';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialCreateDto } from '@/serials/domain/types';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { MovieTypesEnum, TorApiMovieById, TorApiProvidersEnum } from '@/common/types/types';

export interface IGetModerationMovieTasksStrategy {
  getTasks(
    sortField: ModerationMovieTaskSortFiledEnum,
    sortDirection: SortDirectionEnum,
    skip: number,
    size: number,
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<ModerationMovieEntity[] | null>;

  getTotalCount(
    searchMovieName: string | null,
    status: ModerationMovieTypeStatusEnum | null,
  ): Promise<number>;
}

export interface IGetModerationMovieTaskByIdStrategy {
  getTask: (taskId: number) => Promise<ModerationMovieEntity | null>;
}

export interface IAcceptModerationMovieTaskByIdStrategy {
  getTask: (taskId: number) => Promise<ModerationMovieEntity | null>;

  saveTask: (task: ModerationMovieEntity) => Promise<ModerationMovieEntity>;
}

export interface ICancelModerationMovieTaskByIdStrategy {
  getTask: (taskId: number) => Promise<ModerationMovieEntity | null>;

  removeTask(task: ModerationMovieEntity): Promise<void>;

  saveMovie(movie: MovieEntity): Promise<MovieEntity>;
}

export interface IAdminModerationMovieTaskCreateByTorrentStrategy {
  getMovie: (kpId: string) => Promise<Film | Cartoon | Serial | null>;

  createMovie: (dto: CartonCreateDto | FilmCreateDto | SerialCreateDto) => Film | Cartoon | Serial;

  saveMovie: (movie: Film | Cartoon | Serial) => Promise<Film | Cartoon | Serial>;

  createModerationMovieTask: (
    dto: CreateModerationDto,
  ) => ModerationFilmEntity | ModerationCartoonEntity | ModerationSerialEntity;

  saveModerationMovieTask: (
    moderation: ModerationFilmEntity | ModerationCartoonEntity | ModerationSerialEntity,
  ) => Promise<ModerationFilmEntity | ModerationCartoonEntity | ModerationSerialEntity>;
}

export class RemoveMoviePayloadDto {
  key: string;
}

export class AddMovieToDownloadQueuePayloadDto {
  torrent: TorApiMovieById;
  provider: TorApiProvidersEnum;
  type: MovieTypesEnum;
}
