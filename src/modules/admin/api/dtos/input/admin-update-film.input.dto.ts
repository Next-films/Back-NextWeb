import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ToArray } from '@/common/decorators/transform/array.decorator';
import { FILMS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

const URL_VALIDATION_OPTIONS = { require_tld: false };
const trimAndEmptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

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

  @ApiProperty({
    minLength: FILMS_VALIDATION_RULES.KP_ID.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.KP_ID.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(FILMS_VALIDATION_RULES.KP_ID.LENGTH_MIN, FILMS_VALIDATION_RULES.KP_ID.LENGTH_MAX)
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
  @Matches(/\S/, { each: true, message: 'genre must not be blank' })
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

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Transform(trimAndEmptyToNull)
  @IsNotEmpty()
  @IsString()
  @Length(FILMS_VALIDATION_RULES.NAME.LENGTH_MIN, FILMS_VALIDATION_RULES.NAME.LENGTH_MAX)
  universe?: string;

  @ApiPropertyOptional({
    minLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: FILMS_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Transform(trimAndEmptyToNull)
  @IsNotEmpty()
  @IsString()
  @Length(FILMS_VALIDATION_RULES.NAME.LENGTH_MIN, FILMS_VALIDATION_RULES.NAME.LENGTH_MAX)
  studio?: string;

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
  @Matches(/\S/, { each: true, message: 'country must not be blank' })
  country: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl(URL_VALIDATION_OPTIONS)
  videUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl(URL_VALIDATION_OPTIONS)
  trailerUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl(URL_VALIDATION_OPTIONS)
  backgroundContentUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl(URL_VALIDATION_OPTIONS)
  previewUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsUrl(URL_VALIDATION_OPTIONS)
  titleUrl: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  videoFile?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  previewFile?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  titleFile?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  backgroundFile?: Express.Multer.File;
}
