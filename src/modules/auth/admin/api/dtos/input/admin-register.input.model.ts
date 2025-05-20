import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class AdminRegisterInputModel {
  @ApiProperty({
    pattern: ADMIN_AUTH_VALIDATION_RULES.EMAIL.PATTERN.source,
    example: 'email@gmail.com',
  })
  @IsEmail()
  @Matches(ADMIN_AUTH_VALIDATION_RULES.EMAIL.PATTERN)
  email: string;

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

  @ApiProperty({
    pattern: ADMIN_AUTH_VALIDATION_RULES.USERNAME.PATTERN.source,
    example: 'UserName_123',
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Matches(ADMIN_AUTH_VALIDATION_RULES.USERNAME.PATTERN)
  username: string;
}
