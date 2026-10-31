import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdminReadyShortContentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 12;

  @IsOptional()
  @IsIn(['all', 'library', 'youtube'])
  source: 'all' | 'library' | 'youtube' = 'all';

  @IsOptional()
  @IsIn(['all', 'reviewed', 'pending'])
  review: 'all' | 'reviewed' | 'pending' = 'all';

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
