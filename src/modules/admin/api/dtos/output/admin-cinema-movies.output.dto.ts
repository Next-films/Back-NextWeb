import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';

class AdminCinemaMoviesContentOutputDto {
  @ApiProperty({ nullable: true })
  movieUrl: string | null;

  @ApiProperty({ nullable: true })
  trailerUrl: string | null;

  @ApiProperty({ nullable: true })
  previewUrl: string | null;

  @ApiProperty({ nullable: true })
  backgroundUrl: string | null;

  @ApiProperty({ nullable: true })
  titleUrl: string | null;
}

export class AdminCinemaMoviesOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ type: AdminCinemaMoviesContentOutputDto })
  content: AdminCinemaMoviesContentOutputDto;
}

@Injectable()
export class AdminCinemaMoviesOutputDtoMapper {}
