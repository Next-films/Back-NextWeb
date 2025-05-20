import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToNumberArray } from '@/common/decorators/transform/number-array.decorator';

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

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  searchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToNumberArray()
  @IsNumber({}, { each: true })
  searchGenreIds?: number[];
}
