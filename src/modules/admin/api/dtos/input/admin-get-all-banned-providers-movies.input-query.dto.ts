import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { QueryFilterUtil } from '@/common/utils/query-filter.util';
import { TorApiProvidersEnum } from '@/common/types/types';
import { ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class GetAllBannedProvidersMoviesInputQueryDto extends QueryFilterUtil {
  @ApiPropertyOptional({ enum: TorApiProvidersEnum })
  @IsOptional()
  @IsEnum(TorApiProvidersEnum)
  provider?: TorApiProvidersEnum;

  @ApiPropertyOptional({
    minLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    maxLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  )
  providerId?: string;

  @ApiPropertyOptional({
    minLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MIN,
    maxLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MIN,
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MAX,
  )
  movieName?: string;
}
