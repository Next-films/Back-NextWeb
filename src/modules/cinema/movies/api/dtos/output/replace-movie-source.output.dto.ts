import { ApiProperty } from '@nestjs/swagger';

export class ReplaceMovieSourceOutputDto {
  @ApiProperty({ description: 'Ссылка на плейлист, которая была активна до замены' })
  previousVideoUrl: string;
}
