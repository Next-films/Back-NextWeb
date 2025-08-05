import { NewMovieNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-notification.input.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class NewFilmNotificationPayloadDto extends NewMovieNotificationPayloadDto {
  @ApiProperty({ nullable: true })
  @IsNumber()
  @IsNotEmpty()
  duration: number | null;
}
