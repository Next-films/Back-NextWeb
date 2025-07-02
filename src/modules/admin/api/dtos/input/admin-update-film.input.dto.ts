import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToArray } from '@/common/decorators/transform/array.decorator';
import { FILMS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class AdminUpdateFilmInputDto {
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

  @ApiProperty({
    minLength: FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MIN,
    FILMS_VALIDATION_RULES.DESCRIPTION.LENGTH_MAX,
  )
  description: string;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.GENRE.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.GENRE.LENGTH_MAX,
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

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsDate()
  releaseDate: Date;

  @ApiProperty({
    minLength: FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MIN,
    FILMS_VALIDATION_RULES.ORIGINAL_NAME.LENGTH_MAX,
  )
  originalName: string;

  @ApiProperty({
    minLength: FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MIN,
    FILMS_VALIDATION_RULES.ALTERNATIVE_NAME.LENGTH_MAX,
  )
  alternativeName: string;

  @ApiProperty({
    minimum: FILMS_VALIDATION_RULES.DURATION.LENGTH_MIN,
    maximum: FILMS_VALIDATION_RULES.DURATION.LENGTH_MAX,
    description: 'Value in seconds',
  })
  @Trim()
  @IsNotEmpty()
  @IsNumber()
  @Min(FILMS_VALIDATION_RULES.DURATION.LENGTH_MIN)
  @Max(FILMS_VALIDATION_RULES.DURATION.LENGTH_MAX)
  duration: number;

  @ApiProperty({
    minLength: FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MAX,
  })
  @ToArray()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Length(FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MIN, FILMS_VALIDATION_RULES.COUNTRY.LENGTH_MAX, {
    each: true,
  })
  country: string[];

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  videUrl: string;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  trailerUrl: string;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  backgroundContentUrl: string;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  previewUrl: string;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsUrl()
  titleUrl: string;
}
