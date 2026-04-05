import { Genre } from '@/movies/domain/genre.entity';

export class MovieCreateDto {
  kpId: string;
  key: string | null;
  name: string;
  originalName: string | null;
  alternativeName: string | null;
  universe?: string | null;
  studio?: string | null;
  country: string[] | null;
  releaseDate: string | null;
  description: string | null;
  duration: number;
  genres: Genre[] | null;

  hidden: boolean;
  handleStatus: MovieHandleStatus;

  trailerUrl: string | null;
  backgroundContentUrl: string | null;
  horizontalPreviewUrl: string | null;
  previewUrl: string | null;
  titleUrl: string | null;
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
  universe?: string | null;
  studio?: string | null;
  releaseDate: string | null;
  originalName: string | null;
  alternativeName: string | null;
  duration: number;
  country: string[] | null;
  videUrl: string | null;
  trailerUrl: string | null;
  backgroundContentUrl: string | null;
  horizontalPreviewUrl: string | null;
  previewUrl: string | null;
  titleUrl: string | null;
}

export class MovieKpMetadata {
  name: string | null;
  originalName: string | null;
  alternativeName: string | null;
  universe: string | null;
  studio: string | null;
  genres: Genre[] | null;
  countries: string[] | null;
  description: string | null;
  releaseDate: string | null;

  trailerUrl: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  titleUrl: string | null;
}

export class UploadedFilesUrlResult {
  videoUploadedUrl: string | null;
  backgroundUploadedUrl: string | null;
  horizontalPreviewUploadedUrl: string | null;
  previewUploadedUrl: string | null;
  titleUploadedUrl: string | null;
}
