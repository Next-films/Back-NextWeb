import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QueryFilterUtil } from '@/common/utils/query-filter.util';

export class GetAllGenreInputQueryDto extends QueryFilterUtil {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  searchName?: string;
}
