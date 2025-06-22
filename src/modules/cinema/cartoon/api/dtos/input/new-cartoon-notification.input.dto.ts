import { NewMovieNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-notification.input.dto';

export class NewCartoonNotificationPayloadDto extends NewMovieNotificationPayloadDto {
  duration: number | null;
}
