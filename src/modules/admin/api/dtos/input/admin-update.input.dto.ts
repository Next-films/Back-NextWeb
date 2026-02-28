import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class AdminUpdateInputDto {
  @ApiProperty({
    minLength: ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MAX,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MAX,
  )
  username: string;

  @ApiProperty({
    pattern: ADMIN_AUTH_VALIDATION_RULES.EMAIL.PATTERN.source,
    example: 'email@mail.ru',
  })
  @Matches(ADMIN_AUTH_VALIDATION_RULES.EMAIL.PATTERN)
  email: string;

  @ApiProperty({
    minLength: ADMIN_AUTH_VALIDATION_RULES.TELEGRAM_ID.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.TELEGRAM_ID.LENGTH_MAX,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.TELEGRAM_ID.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.TELEGRAM_ID.LENGTH_MAX,
  )
  tgId: string;
}
