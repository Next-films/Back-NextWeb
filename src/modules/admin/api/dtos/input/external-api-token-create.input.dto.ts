import { ApiProperty } from '@nestjs/swagger';
import { ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';

export class ExternalApiTokenCreateInputDto {
  @ApiProperty({
    minLength: ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.NAME.LENGTH_MIN,
    maxLength: ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.NAME.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.NAME.LENGTH_MIN,
    ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.NAME.LENGTH_MAX,
  )
  name: string;

  @ApiProperty({
    enum: ExternalApiTokenExpAtEnum,
  })
  @IsEnum(ExternalApiTokenExpAtEnum)
  expAt: ExternalApiTokenExpAtEnum;
}
