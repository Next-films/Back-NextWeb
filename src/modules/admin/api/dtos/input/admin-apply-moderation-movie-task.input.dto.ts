import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MovieTypesEnum, TorApiProvidersEnum } from '@/common/types/types';
import { FILMS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToArray } from '@/common/decorators/transform/array.decorator';

export class AdminApplyModerationMovieTaskInputDto {
  @ApiProperty({ enum: MovieTypesEnum })
  @IsEnum(MovieTypesEnum)
  type: MovieTypesEnum;

  @ApiProperty({
    minLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(FILMS_VALIDATION_RULES.NAME.LENGTH_MIN, FILMS_VALIDATION_RULES.NAME.LENGTH_MAX)
  name: string;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsString()
  kpId: string;

  @ApiPropertyOptional({ enum: TorApiProvidersEnum })
  @IsOptional()
  @IsEnum(TorApiProvidersEnum)
  provider?: TorApiProvidersEnum;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    FILMS_VALIDATION_RULES.PROVIDER_ID.LENGTH_MIN,
    FILMS_VALIDATION_RULES.PROVIDER_ID.LENGTH_MAX,
  )
  providerId?: string;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MIN,
    FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MAX,
  )
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsDate()
  releaseDate?: Date;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MIN,
    FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MAX,
  )
  originalName?: string;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MIN,
    FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MAX,
  )
  alternativeName?: string;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MAX,
  })
  @IsOptional()
  @ToArray()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Length(FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MIN, FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MAX, {
    each: true,
  })
  country?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  trailerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  previewUrl?: string;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.GENRE.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.GENRE.LENGTH_MAX,
    description: "If you don't need to update genres, then this key should be empty.",
  })
  @IsOptional()
  @ToArray()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Length(FILMS_VALIDATION_RULES.GENRE.LENGTH_MIN, FILMS_VALIDATION_RULES.GENRE.LENGTH_MAX, {
    each: true,
  })
  genres?: string[];

  @ApiPropertyOptional({
    minimum: FILMS_VALIDATION_RULES.DURATION.LENGTH_MIN,
    maximum: FILMS_VALIDATION_RULES.DURATION.LENGTH_MAX,
    description: 'Value in seconds',
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsNumber()
  @Min(FILMS_VALIDATION_RULES.DURATION.LENGTH_MIN)
  @Max(FILMS_VALIDATION_RULES.DURATION.LENGTH_MAX)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  videUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  backgroundContentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  titleUrl?: string;
}
