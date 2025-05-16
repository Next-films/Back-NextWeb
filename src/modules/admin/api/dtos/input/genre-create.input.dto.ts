import { ApiProperty } from '@nestjs/swagger';
import { GENRE_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class GenreCreateInputDto {
  @ApiProperty({
    minLength: GENRE_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: GENRE_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(GENRE_VALIDATION_RULES.NAME.LENGTH_MIN, GENRE_VALIDATION_RULES.NAME.LENGTH_MAX)
  name: string;
}
