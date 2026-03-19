import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class AdminSetupPasswordInputModel {
  @ApiProperty({
    minLength: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX,
    pattern: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.PATTERN.source,
    example: 'Password12345&',
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX,
  )
  @Matches(ADMIN_AUTH_VALIDATION_RULES.PASSWORD.PATTERN)
  password: string;
}
