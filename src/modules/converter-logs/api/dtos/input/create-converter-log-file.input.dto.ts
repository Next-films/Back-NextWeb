import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsArray, IsNotEmpty, IsString, IsUrl, Length } from 'class-validator';
import { ToArray } from '@/common/decorators/transform/array.decorator';
import { CONVERTER_LOGS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class UploadedLogFilePayloadDto {
  @ApiProperty({
    minLength: CONVERTER_LOGS_VALIDATION_RULES.KEYS.LENGTH_MAX,
    maxLength: CONVERTER_LOGS_VALIDATION_RULES.KEYS.LENGTH_MAX,
  })
  @ToArray()
  @IsArray()
  @IsNotEmpty({ each: true })
  @Length(
    CONVERTER_LOGS_VALIDATION_RULES.KEYS.LENGTH_MIN,
    CONVERTER_LOGS_VALIDATION_RULES.KEYS.LENGTH_MAX,
    { each: true },
  )
  @IsUrl({}, { each: true })
  keys: string[];

  @ApiProperty({
    minLength: CONVERTER_LOGS_VALIDATION_RULES.MOVIE_KP_ID.LENGTH_MIN,
    maxLength: CONVERTER_LOGS_VALIDATION_RULES.MOVIE_KP_ID.LENGTH_MAX,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    CONVERTER_LOGS_VALIDATION_RULES.MOVIE_KP_ID.LENGTH_MIN,
    CONVERTER_LOGS_VALIDATION_RULES.MOVIE_KP_ID.LENGTH_MAX,
  )
  movieKpId: string;
}
