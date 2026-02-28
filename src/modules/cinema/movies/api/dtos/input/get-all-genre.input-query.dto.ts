import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { QueryFilterUtil } from '@/common/utils/query-filter.util';
import { GENRE_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class GetAllGenreInputQueryDto extends QueryFilterUtil {
  @ApiPropertyOptional({
    minLength: GENRE_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: GENRE_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(GENRE_VALIDATION_RULES.NAME.LENGTH_MIN, GENRE_VALIDATION_RULES.NAME.LENGTH_MAX)
  searchName?: string;
}
