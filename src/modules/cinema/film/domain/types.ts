import { MovieCreateDto, NewMovieNotificationPayloadDto } from '@/movies/domain/types';

export class NewFilmNotificationPayloadDto extends NewMovieNotificationPayloadDto {
  duration: number | null;
}

export class FilmCreateDto extends MovieCreateDto {}
