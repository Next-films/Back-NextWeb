import { Genre } from '@/movies/domain/genre.entity';

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

export class MovieUpdateDto {
  name: string;
  kpId: string;
  description: string | null;
  genres: Genre[] | null;
  releaseDate: string | null;
  originalName: string | null;
  alternativeName: string | null;
  duration: number;
  country: string[] | null;
  videUrl: string | null;
  trailerUrl: string | null;
  backgroundContentUrl: string | null;
  previewUrl: string | null;
  titleUrl: string | null;
}
