import { NewMovieNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-notification.input.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class NewSerialNotificationPayloadDto extends NewMovieNotificationPayloadDto {
  @ApiProperty({ nullable: true })
  @IsNumber()
  @IsNotEmpty()
  duration: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  seasonNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  episodeNumber?: number;
}
