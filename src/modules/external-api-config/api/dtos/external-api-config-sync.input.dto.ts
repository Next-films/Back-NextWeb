import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

export class ExternalApiConfigSyncItemDto {
  @IsEnum(ExternalApiProviderEnum)
  provider: ExternalApiProviderEnum;

  @IsEnum(ExternalApiTargetEnum)
  target: ExternalApiTargetEnum;

  @IsString()
  baseUrl: string;

  @IsOptional()
  @IsString()
  token?: string | null;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class ExternalApiConfigSyncInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalApiConfigSyncItemDto)
  configs: ExternalApiConfigSyncItemDto[];
}
