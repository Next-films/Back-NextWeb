import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { MovieTypesEnum } from '@/common/types/types';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ADMIN_MODERATION_MOVIES_TASK_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export enum ModerationMovieTypeStatusEnum {
  ACCEPTED = 'accepted',
  PENDING = 'pending',
  ALL = 'all',
}

export enum ModerationMovieTaskSortFiledEnum {
  CREATED_AT = 'createdAt',
  ACCEPTED_AT = 'acceptedAt',
}

export class GetAllModerationMovieTaskInputQueryDto extends QuerySortFilterUtil {
  @ApiPropertyOptional({
    enum: ModerationMovieTaskSortFiledEnum,
    default: ModerationMovieTaskSortFiledEnum.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ModerationMovieTaskSortFiledEnum)
  sortField: ModerationMovieTaskSortFiledEnum = ModerationMovieTaskSortFiledEnum.CREATED_AT;

  @ApiPropertyOptional({ enum: MovieTypesEnum, default: MovieTypesEnum.FILM })
  @IsOptional()
  @IsEnum(MovieTypesEnum)
  type: MovieTypesEnum = MovieTypesEnum.FILM;

  @ApiPropertyOptional({
    enum: ModerationMovieTypeStatusEnum,
    default: ModerationMovieTypeStatusEnum.PENDING,
  })
  @IsOptional()
  @IsEnum(ModerationMovieTypeStatusEnum)
  status?: ModerationMovieTypeStatusEnum = ModerationMovieTypeStatusEnum.PENDING;

  @ApiPropertyOptional({
    minLength: ADMIN_MODERATION_MOVIES_TASK_VALIDATION_RULES.SEARCH_MOVIE_NAME.LENGTH_MIN,
    maxLength: ADMIN_MODERATION_MOVIES_TASK_VALIDATION_RULES.SEARCH_MOVIE_NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    ADMIN_MODERATION_MOVIES_TASK_VALIDATION_RULES.SEARCH_MOVIE_NAME.LENGTH_MIN,
    ADMIN_MODERATION_MOVIES_TASK_VALIDATION_RULES.SEARCH_MOVIE_NAME.LENGTH_MAX,
  )
  searchMovieName?: string;
}
