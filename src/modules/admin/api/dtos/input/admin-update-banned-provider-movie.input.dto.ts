import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ADMIN_BANNED_PROVIDERS_MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class AdminUpdateBannedProviderMovieInputDto {
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
}
