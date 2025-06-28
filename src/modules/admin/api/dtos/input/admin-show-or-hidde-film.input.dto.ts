import { MovieHandleStatus } from '@/movies/domain/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ToBoolean } from '@/common/decorators/transform/boolean.decorator';

export class AdminShowOrHiddeFilmInputDto {
  @ApiProperty()
  @ToBoolean()
  @IsBoolean()
  isHidden: boolean;

  @ApiPropertyOptional({ enum: MovieHandleStatus })
  @IsOptional()
  @IsEnum(MovieHandleStatus)
  status?: MovieHandleStatus;
}
