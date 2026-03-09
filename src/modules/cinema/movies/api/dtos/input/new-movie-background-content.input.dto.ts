import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUrl } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class NewMovieBackgroundContentPayloadDto {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsNumber()
  movieId: number;
}
