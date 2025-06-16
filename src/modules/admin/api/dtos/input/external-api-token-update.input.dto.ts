import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';

export class ExternalApiTokenUpdateInputDto {
  @ApiProperty({
    enum: ExternalApiTokenExpAtEnum,
  })
  @IsEnum(ExternalApiTokenExpAtEnum)
  expAt: ExternalApiTokenExpAtEnum;
}
