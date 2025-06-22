import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToNumberArray } from '@/common/decorators/transform/number-array.decorator';
import { FILMS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export enum GetFilmsSortFieldEnum {
  RELEASE_DATE = 'releaseDate',
  TITLE = 'title',
  ORIGINAL_TITLE = 'originalTitle',
}

export class GetFilmsInputQuery extends QuerySortFilterUtil {
  @ApiPropertyOptional({ enum: GetFilmsSortFieldEnum, default: GetFilmsSortFieldEnum.RELEASE_DATE })
  @IsOptional()
  @IsEnum(GetFilmsSortFieldEnum)
  sortField: GetFilmsSortFieldEnum = GetFilmsSortFieldEnum.RELEASE_DATE;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(FILMS_VALIDATION_RULES.NAME.LENGTH_MIN, FILMS_VALIDATION_RULES.NAME.LENGTH_MAX)
  searchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToNumberArray()
  @IsNumber({}, { each: true })
  searchGenreIds?: number[];
}
