import { Genre } from '@/movies/domain/genre.entity';

export class NewMovieNotificationPayloadDto {
  kpId: string;
  key: string;
}

export class NewMovieIsHandleNotificationPayloadDto {
  kpIds: string[];
}

export class MovieCreateDto {
  kpId: string;
  key: string | null;
  name: string;
  originalName: string | null;
  alternativeName: string;
  country: string[] | null;
  releaseDate: string | null;
  description: string | null;
  duration: number;
  genres: Genre[] | null;

  hidden: boolean;
  handleStatus: MovieHandleStatus;
}

export enum MovieHandleStatus {
  PROCESSING = 'processing',
  MODERATE = 'moderate',
  PRODUCTION = 'production',
}
