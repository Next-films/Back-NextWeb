import { NewMovieNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-notification.input.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class NewCartoonNotificationPayloadDto extends NewMovieNotificationPayloadDto {
  @ApiProperty({ nullable: true })
  @IsNumber()
  @IsNotEmpty()
  duration: number | null;
}
