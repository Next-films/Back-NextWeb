import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class AdminLoginInputModel {
  private static readonly DEV_DIRECT_LOGIN = 'DEV_LOCAL_LOGIN';

  @ApiProperty({
    minLength: 4,
    maxLength: 30,
    example: 'admin',
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MIN, 30)
  login: string;

  @ApiProperty({
    minLength: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX,
    pattern: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.PATTERN.source,
    example: 'Password12345&',
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.login === AdminLoginInputModel.DEV_DIRECT_LOGIN)
  @Length(5, ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX)
  @ValidateIf(o => o.login !== AdminLoginInputModel.DEV_DIRECT_LOGIN)
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX,
  )
  @ValidateIf(o => o.login !== AdminLoginInputModel.DEV_DIRECT_LOGIN)
  @Matches(ADMIN_AUTH_VALIDATION_RULES.PASSWORD.PATTERN)
  password: string;
}
