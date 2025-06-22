import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToNumberArray } from '@/common/decorators/transform/number-array.decorator';
import { SERIALS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export enum GetSerialSortFieldEnum {
  RELEASE_DATE = 'releaseDate',
  TITLE = 'title',
  ORIGINAL_TITLE = 'originalTitle',
}

export class GetSerialInputQuery extends QuerySortFilterUtil {
  @ApiPropertyOptional({
    enum: GetSerialSortFieldEnum,
    default: GetSerialSortFieldEnum.RELEASE_DATE,
  })
  @IsOptional()
  @IsEnum(GetSerialSortFieldEnum)
  sortField: GetSerialSortFieldEnum = GetSerialSortFieldEnum.RELEASE_DATE;

  @ApiPropertyOptional({
    minLength: SERIALS_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: SERIALS_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(SERIALS_VALIDATION_RULES.NAME.LENGTH_MIN, SERIALS_VALIDATION_RULES.NAME.LENGTH_MAX)
  searchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToNumberArray()
  @IsNumber({}, { each: true })
  searchGenreIds?: number[];
}
