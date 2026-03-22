import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export type FindTorApiTorrentFilmType = Partial<
  Record<keyof TorApiSearchByTitleAllProviders, TorApiMovieById[] | null>
>;

export enum ImgExtEnum {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  WEBP = 'webp',
  AVIF = 'avif',
}

export enum TorApiProvidersEnum {
  'RUTRACKER' = 'rutracker',
  'KINOZAL' = 'kinozal',
  'RUTOR' = 'rutor',
  'NONAMECLUB' = 'nonameclub',
}

export type TorApiSearchByTitleAllProviders = {
  RuTracker: TorApiSearchByTitle[] | TorApiSearchNotFoundResult;
  Kinozal: TorApiSearchByTitle[] | TorApiSearchNotFoundResult;
  RuTor: TorApiSearchByTitle[] | TorApiSearchNotFoundResult;
  NoNameClub: TorApiSearchByTitle[] | TorApiSearchNotFoundResult;
};

type TorApiSearchNotFoundResult = {
  Result: string;
};

export type TorApiFilesType = {
  Name: string;
  Size: string;
};

export type TorApiSearchByTitle = {
  Name: string;
  Id: string;
  Url: string;
  Torrent: string;
  Size: string;

  Download_Count?: string; // Rutracker
  Checked?: string; // Rutracker
  Category?: string; // Rutracker, Kinozal, Nonameclub
  Seeds: string;
  Peers: string;

  Title?: string; // Kinozal
  Original_Name?: string; // Kinozal
  Year?: string; // Kinozal
  Language?: string; // Kinozal
  Format?: string; // Kinozal
  Comments?: string; // Kinozal, Rutor, Nonameclub

  Time?: string; // Kinozal, Nonameclub
  Date: string;

  Hash?: string; // Rutor
};

export type TorApiMovieById = {
  Id: string;
  Name: string;
  Url: string;
  Hash: string;
  Magnet: string;
  Torrent: string;
  Poster: string;
  Files: TorApiFilesType[];

  IMDb_link?: string; // kinozal, rutor, nonameclub
  Kinopoisk_link?: string; // kinozal, nonameclub
  IMDb_id?: string; // kinozal, rutor, nonameclub
  Kinopoisk_id?: string; // kinozal, nonameclub
  Year?: string; // rutracker, kinozal, rutor
  Release?: string; // rutracker, kinozal, nonameclub
  Type?: string; // rutracker, kinozal, rutor, nonameclub
  Duration?: string; // rutracker, kinozal, nonameclub
  Audio?: string; // rutracker, kinozal, nonameclub
  Directer?: string; // rutracker, kinozal, nonameclub
  Actors?: string; // rutracker, kinozal, nonameclub
  Description?: string; // rutracker, kinozal, nonameclub
  Quality?: string; // rutracker, kinozal, nonameclub
  Video?: string; // rutracker, kinozal, nonameclub

  Original_Name?: string; // kinozal
  Size?: string; // kinozal
  Transcript?: string; // kinozal
  Seeds?: string; // kinozal
  Peers?: string; // kinozal
  Download_Count?: string; // kinozal
  Files_Count?: string; // kinozal
  Comments?: string; // kinozal
  IMDb_Rating?: string; // kinozal
  Kinopoisk_Rating?: string; // kinozal
  Kinozal_Rating?: string; // kinozal
  Votes?: string; // kinozal
  Added_Date?: string; // kinozal
  Update_Date?: string; // kinozal
  Posters?: string[]; // kinozal

  Rating?: string; // rutor, nonameclub
  Category?: string; // rutor
  Seed_Date?: string; // rutor
  Add_Date?: string; // rutor

  Registration?: string; // nonameclub
};

export enum MovieTypesEnum {
  FILM = 'film',
  CARTOON = 'cartoon',
  SERIAL = 'serial',
  BANNER = 'banner',
}

export type DownloaderTriggerScheduleDto = {
  findFilms: string;
  findCartoons: string;
  findSerials: string;
  downloadFilms: string;
  downloadCartoons: string;
  downloadSerials: string;
};

export const DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE: DownloaderTriggerScheduleDto = {
  findFilms: '0 1 * * *',
  findCartoons: '0 2 * * *',
  findSerials: '0 3 * * *',
  downloadFilms: '0 5 * * *',
  downloadCartoons: '0 13 * * *',
  downloadSerials: '0 21 * * *',
};

export type DownloaderTriggerTaskStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';
export type DownloaderTriggerTaskSource = 'manual' | 'auto';
export type DownloaderProcessingStage =
  | 'none'
  | 'download'
  | 'convert'
  | 'upload'
  | 'notify'
  | 'cleanup'
  | 'error';

export type DownloaderTriggerTaskRuntimeItem = {
  status: DownloaderTriggerTaskStatus;
  source: DownloaderTriggerTaskSource | null;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string | null;
  executionId: string | null;
  stage: DownloaderProcessingStage | null;
  stageProgress: number | null;
  overallProgress: number | null;
  details: string | null;
};

export type DownloaderTriggerTaskRuntimeStatusDto = Record<
  keyof DownloaderTriggerScheduleDto,
  DownloaderTriggerTaskRuntimeItem
>;

export type DownloaderRunByListInputDto = {
  films?: string[];
  cartoons?: string[];
  serials?: string[];
};

export type HandledRmqErrorType = {
  isError: boolean;
  isStopProcess: boolean;
};

export interface IDownloaderServiceAdapter {
  bridgeRunByList(payload: DownloaderRunByListInputDto): void | Promise<void>;
  cancelBridgeProcess():
    | AppNotificationResult<{ message: string }, ErrorFieldExceptionDto | null>
    | Promise<AppNotificationResult<{ message: string }, ErrorFieldExceptionDto | null>>;

  bridgeFindFilms(): void | Promise<void>;

  bridgeDownloadFilms(): void | Promise<void>;

  bridgeFindCartoons(): void | Promise<void>;

  bridgeDownloadCartoons(): void | Promise<void>;

  bridgeFindSerials(): void | Promise<void>;

  bridgeDownloadSerials(): void | Promise<void>;

  bridgeReconcileSerialByKpId(
    kpId: string,
  ): Promise<AppNotificationResult<{ message: string }, ErrorFieldExceptionDto | null>> | void;

  getBridgeSchedule(): DownloaderTriggerScheduleDto | Promise<DownloaderTriggerScheduleDto>;

  updateBridgeSchedule(
    schedule: Partial<DownloaderTriggerScheduleDto>,
  ): DownloaderTriggerScheduleDto | Promise<DownloaderTriggerScheduleDto>;

  getBridgeStatus():
    | DownloaderTriggerTaskRuntimeStatusDto
    | Promise<DownloaderTriggerTaskRuntimeStatusDto>;

  clearLogs(keys: string[]): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>>;

  removeMovie(key: string): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>>;

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>>;

  signMediaUrl(url: string | null, expiresInSec?: number): Promise<string | null>;
}

export class UploadFilmPayloadDto {
  type: MovieTypesEnum;
  movieId: number;
  file: Express.Multer.File;
}

export class DownloadPreviewYtClipPayloadDto {
  type: MovieTypesEnum;
  movieId: number;
  url?: string;
  file?: Express.Multer.File;
}

export class ResizeAndSafePosterPayloadDto {
  type: MovieTypesEnum;
  url?: string;
  movieId: number;
  file?: Express.Multer.File;
}

export class ResizeAndSafeLogoPayloadDto {
  type: MovieTypesEnum;
  url?: string;
  movieId: number;
  file?: Express.Multer.File;
}

export class AdminUploadAvatarPayloadDto {
  file: Express.Multer.File;
  extension: ImgExtEnum;
  adminId: number;
  currentAvatarPath: string;
}
