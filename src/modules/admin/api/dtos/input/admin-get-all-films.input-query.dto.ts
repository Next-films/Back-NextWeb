import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { FILMS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { ToNumberArray } from '@/common/decorators/transform/number-array.decorator';
import { MovieHandleStatus } from '@/movies/domain/types';

export enum AdminGetFilmsSortFieldEnum {
  RELEASE_DATE = 'releaseDate',
  TITLE = 'title',
  ORIGINAL_TITLE = 'originalTitle',
}

export enum AdminGetFilmsStatusEnum {
  MODERATE = MovieHandleStatus.MODERATE,
  PRODUCTION = MovieHandleStatus.PRODUCTION,
  PROCESSING = MovieHandleStatus.PROCESSING,
  ALL = 'all',
}

export class AdminGetAllFilmsInputQueryDto extends QuerySortFilterUtil {
  @ApiPropertyOptional({
    enum: AdminGetFilmsSortFieldEnum,
    default: AdminGetFilmsSortFieldEnum.RELEASE_DATE,
  })
  @IsOptional()
  @IsEnum(AdminGetFilmsSortFieldEnum)
  sortField: AdminGetFilmsSortFieldEnum = AdminGetFilmsSortFieldEnum.RELEASE_DATE;

  @ApiPropertyOptional({
    enum: AdminGetFilmsStatusEnum,
    default: AdminGetFilmsStatusEnum.PRODUCTION,
  })
  @IsOptional()
  @IsEnum(AdminGetFilmsStatusEnum)
  status?: AdminGetFilmsStatusEnum = AdminGetFilmsStatusEnum.ALL;

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
