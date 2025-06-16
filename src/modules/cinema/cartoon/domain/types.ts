import { MovieCreateDto, NewMovieNotificationPayloadDto } from '@/movies/domain/types';

export class NewCartoonNotificationPayloadDto extends NewMovieNotificationPayloadDto {
  duration: number | null;
}

export class CartonCreateDto extends MovieCreateDto {}
