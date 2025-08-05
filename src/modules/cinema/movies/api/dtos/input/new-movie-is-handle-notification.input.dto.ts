import { ApiProperty } from '@nestjs/swagger';
import { ToArray } from '@/common/decorators/transform/array.decorator';
import { IsArray, IsNotEmpty, IsString, Length } from 'class-validator';
import { MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class NewMovieIsHandleNotificationPayloadDto {
  @ApiProperty({
    minLength: MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MIN,
    maxLength: MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MAX,
  })
  @ToArray()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Length(MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MIN, MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MAX, {
    each: true,
  })
  kpIds: string[];
}
