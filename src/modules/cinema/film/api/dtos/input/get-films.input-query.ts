import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';

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
}
