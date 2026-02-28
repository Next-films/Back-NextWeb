import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToNumberArray } from '@/common/decorators/transform/number-array.decorator';
import { CARTOONS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export enum GetCartoonSortFieldEnum {
  RELEASE_DATE = 'releaseDate',
  TITLE = 'title',
  ORIGINAL_TITLE = 'originalTitle',
}

export class GetCartoonInputQuery extends QuerySortFilterUtil {
  @ApiPropertyOptional({
    enum: GetCartoonSortFieldEnum,
    default: GetCartoonSortFieldEnum.RELEASE_DATE,
  })
  @IsOptional()
  @IsEnum(GetCartoonSortFieldEnum)
  sortField: GetCartoonSortFieldEnum = GetCartoonSortFieldEnum.RELEASE_DATE;

  @ApiPropertyOptional({
    minLength: CARTOONS_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: CARTOONS_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(CARTOONS_VALIDATION_RULES.NAME.LENGTH_MIN, CARTOONS_VALIDATION_RULES.NAME.LENGTH_MAX)
  searchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToNumberArray()
  @IsNumber({}, { each: true })
  searchGenreIds?: number[];
}
