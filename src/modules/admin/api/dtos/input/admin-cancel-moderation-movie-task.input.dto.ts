import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MovieTypesEnum } from '@/common/types/types';

export class AdminCancelModerationMovieTaskInputDto {
  @ApiProperty({ enum: MovieTypesEnum })
  @IsEnum(MovieTypesEnum)
  type: MovieTypesEnum;
}
