import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BASIC_QUERY_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

const DEFAULT_QUERY_SORTED_FIELD = 'id';

export enum SortDirectionEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryFilterUtil {
  @ApiPropertyOptional({ default: BASIC_QUERY_VALIDATION_RULES.PAGE.LENGTH_MIN })
  @IsOptional()
  @IsInt()
  @Min(BASIC_QUERY_VALIDATION_RULES.PAGE.LENGTH_MIN)
  @Max(BASIC_QUERY_VALIDATION_RULES.PAGE.LENGTH_MAX)
  page: number;

  @ApiPropertyOptional({ default: BASIC_QUERY_VALIDATION_RULES.SIZE.LENGTH_MAX })
  @IsOptional()
  @IsInt()
  @Min(BASIC_QUERY_VALIDATION_RULES.SIZE.LENGTH_MIN)
  @Max(BASIC_QUERY_VALIDATION_RULES.SIZE.LENGTH_MAX)
  size: number;

  constructor(page: number, size: number) {
    this.page = page ?? BASIC_QUERY_VALIDATION_RULES.PAGE.LENGTH_MIN;
    this.size = size ?? BASIC_QUERY_VALIDATION_RULES.SIZE.LENGTH_MAX;
  }
}

export class QuerySortFilterUtil extends QueryFilterUtil {
  @ApiPropertyOptional({ enum: SortDirectionEnum, default: SortDirectionEnum.DESC })
  @IsOptional()
  @IsEnum(SortDirectionEnum)
  sortDirection: SortDirectionEnum = SortDirectionEnum.DESC;

  @ApiPropertyOptional({ default: DEFAULT_QUERY_SORTED_FIELD })
  @IsOptional()
  @IsString()
  sortField: string = DEFAULT_QUERY_SORTED_FIELD;

  constructor(page: number, size: number) {
    super(page, size);
  }
}
