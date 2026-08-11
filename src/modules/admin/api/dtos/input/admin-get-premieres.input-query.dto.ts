import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { FILMS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Type } from 'class-transformer';

export enum AdminPremiereTypeEnum {
  ALL = 'all',
  FILM = 'film',
  CARTOON = 'cartoon',
  SERIAL = 'serial',
}

export enum AdminUpsertPremiereTypeEnum {
  FILM = AdminPremiereTypeEnum.FILM,
  CARTOON = AdminPremiereTypeEnum.CARTOON,
  SERIAL = AdminPremiereTypeEnum.SERIAL,
}

export enum AdminPremiereAvailabilityStatusEnum {
  ALL = 'all',
  UPCOMING = MovieAvailabilityStatus.UPCOMING,
  RELEASED_NO_VIDEO = MovieAvailabilityStatus.RELEASED_NO_VIDEO,
}

export enum AdminGetPremieresSortFieldEnum {
  RELEASE_DATE = 'releaseDate',
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminPremiereHandleStatusEnum {
  ALL = 'all',
  PROCESSING = MovieHandleStatus.PROCESSING,
  MODERATE = MovieHandleStatus.MODERATE,
  PRODUCTION = MovieHandleStatus.PRODUCTION,
}

export class AdminGetPremieresInputQueryDto extends QuerySortFilterUtil {
  @ApiPropertyOptional({
    enum: AdminGetPremieresSortFieldEnum,
    default: AdminGetPremieresSortFieldEnum.RELEASE_DATE,
  })
  @IsOptional()
  @IsEnum(AdminGetPremieresSortFieldEnum)
  sortField: AdminGetPremieresSortFieldEnum = AdminGetPremieresSortFieldEnum.RELEASE_DATE;

  @ApiPropertyOptional({
    enum: AdminPremiereTypeEnum,
    default: AdminPremiereTypeEnum.ALL,
  })
  @IsOptional()
  @IsEnum(AdminPremiereTypeEnum)
  type?: AdminPremiereTypeEnum = AdminPremiereTypeEnum.ALL;

  @ApiPropertyOptional({
    enum: AdminPremiereAvailabilityStatusEnum,
    default: AdminPremiereAvailabilityStatusEnum.ALL,
  })
  @IsOptional()
  @IsEnum(AdminPremiereAvailabilityStatusEnum)
  availabilityStatus?: AdminPremiereAvailabilityStatusEnum =
    AdminPremiereAvailabilityStatusEnum.ALL;

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
}

export class AdminUpsertPremiereInputDto {
  @ApiProperty({ enum: AdminUpsertPremiereTypeEnum })
  @IsEnum(AdminUpsertPremiereTypeEnum)
  type: AdminUpsertPremiereTypeEnum;

  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  kpId: string;
}

export class AdminReprocessPremiereAssetsInputDto {
  @ApiPropertyOptional({
    enum: AdminPremiereTypeEnum,
    default: AdminPremiereTypeEnum.ALL,
  })
  @IsOptional()
  @IsEnum(AdminPremiereTypeEnum)
  type?: AdminPremiereTypeEnum = AdminPremiereTypeEnum.ALL;

  @ApiPropertyOptional({
    enum: AdminPremiereHandleStatusEnum,
    default: AdminPremiereHandleStatusEnum.MODERATE,
  })
  @IsOptional()
  @IsEnum(AdminPremiereHandleStatusEnum)
  handleStatus?: AdminPremiereHandleStatusEnum = AdminPremiereHandleStatusEnum.MODERATE;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  onlyMissingAssets?: boolean = true;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
