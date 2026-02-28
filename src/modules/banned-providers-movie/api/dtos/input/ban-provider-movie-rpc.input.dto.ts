import { TorApiProvidersEnum } from '@/common/types/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class BanProviderMoviePayloadDto {
  @ApiProperty({ enum: TorApiProvidersEnum })
  @IsEnum(TorApiProvidersEnum)
  provider: TorApiProvidersEnum;

  @ApiProperty({
    minLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    maxLength: ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  )
  providerId: string;

  @ApiPropertyOptional({
    nullable: true,
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
  movieName: string | null;
}
