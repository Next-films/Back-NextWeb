import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class AdminExternalApiConfigCreateInputDto {
  @ApiProperty({ enum: ExternalApiProviderEnum })
  @IsEnum(ExternalApiProviderEnum)
  provider: ExternalApiProviderEnum;

  @ApiProperty({ enum: ExternalApiTargetEnum })
  @IsEnum(ExternalApiTargetEnum)
  target: ExternalApiTargetEnum;

  @ApiProperty()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  baseUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class AdminExternalApiConfigUpdateInputDto {
  @ApiPropertyOptional({ enum: ExternalApiProviderEnum })
  @IsOptional()
  @IsEnum(ExternalApiProviderEnum)
  provider?: ExternalApiProviderEnum;

  @ApiPropertyOptional({ enum: ExternalApiTargetEnum })
  @IsOptional()
  @IsEnum(ExternalApiTargetEnum)
  target?: ExternalApiTargetEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @IsUrl()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  token?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
