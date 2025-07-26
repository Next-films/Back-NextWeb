import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export type FindTorApiTorrentFilmType = Partial<
  Record<keyof TorApiSearchByTitleAllProviders, TorApiMovieById[] | null>
>;

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
}

export type HandledRmqErrorType = {
  isError: boolean;
  isStopProcess: boolean;
};

export interface IDownloaderServiceAdapter {
  bridgeFindFilms(): void | Promise<void>;

  bridgeDownloadFilms(): void | Promise<void>;

  bridgeFindCartoons(): void | Promise<void>;

  bridgeDownloadCartoons(): void | Promise<void>;

  bridgeFindSerials(): void | Promise<void>;

  bridgeDownloadSerials(): void | Promise<void>;

  clearLogs(keys: string[]): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>>;

  removeMovie(key: string): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>>;

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>>;
}
