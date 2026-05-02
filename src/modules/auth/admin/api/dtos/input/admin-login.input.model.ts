import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class AdminLoginInputModel {
  private static readonly DEV_DIRECT_LOGIN_TOKEN = 'DEV_LOCAL_LOGIN';

  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    example: '2f3f2ae2-1e5d-4236-b4f5-57d0f053c4fa',
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(10, 500)
  token: string;

  @ApiProperty({
    minLength: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX,
    pattern: ADMIN_AUTH_VALIDATION_RULES.PASSWORD.PATTERN.source,
    example: 'Password12345&',
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.token === AdminLoginInputModel.DEV_DIRECT_LOGIN_TOKEN)
  @Length(5, ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX)
  @ValidateIf(o => o.token !== AdminLoginInputModel.DEV_DIRECT_LOGIN_TOKEN)
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.PASSWORD.LENGTH_MAX,
  )
  @ValidateIf(o => o.token !== AdminLoginInputModel.DEV_DIRECT_LOGIN_TOKEN)
  @Matches(ADMIN_AUTH_VALIDATION_RULES.PASSWORD.PATTERN)
  password: string;
}
