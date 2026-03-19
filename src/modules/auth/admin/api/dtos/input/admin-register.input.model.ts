import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export class AdminRegisterInputModel {
  @ApiProperty({
    pattern: ADMIN_AUTH_VALIDATION_RULES.USERNAME.PATTERN.source,
    example: 'UserName_123',
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Matches(ADMIN_AUTH_VALIDATION_RULES.USERNAME.PATTERN)
  username: string;

  @ApiProperty({
    pattern: ADMIN_AUTH_VALIDATION_RULES.USERNAME.PATTERN.source,
    example: 'telegram_user_name',
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Matches(ADMIN_AUTH_VALIDATION_RULES.USERNAME.PATTERN)
  telegramUsername: string;

  @ApiProperty({ enum: AdminRoleEnum, isArray: true })
  @IsEnum(AdminRoleEnum, { each: true })
  roles: AdminRoleEnum[];
}
