import { TorApiProvidersEnum } from '@/common/types/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToBoolean } from '@/common/decorators/transform/boolean.decorator';
import { ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class AdminBanUnbanProviderMovieInputDto {
  @ApiProperty({
    minLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    maxLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  )
  providerId: string;

  @ApiProperty({
    minLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MIN,
    maxLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MIN,
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MAX,
  )
  movieName: string;

  @ApiProperty({ enum: TorApiProvidersEnum })
  @IsEnum(TorApiProvidersEnum)
  provider: TorApiProvidersEnum;

  @ApiProperty()
  @ToBoolean()
  @IsBoolean()
  isBan: boolean;
}
