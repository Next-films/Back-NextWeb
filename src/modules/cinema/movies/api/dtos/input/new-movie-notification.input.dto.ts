import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, Length } from 'class-validator';
import { MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class NewMovieNotificationPayloadDto {
  @ApiProperty({
    minLength: MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MIN,
    maxLength: MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MAX,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MIN, MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MAX)
  kpId: string;

  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  key: string;
}
