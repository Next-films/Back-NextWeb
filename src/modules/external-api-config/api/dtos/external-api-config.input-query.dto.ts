import { IsEnum } from 'class-validator';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

export class ExternalApiConfigInputQueryDto {
  @IsEnum(ExternalApiProviderEnum)
  provider: ExternalApiProviderEnum;

  @IsEnum(ExternalApiTargetEnum)
  target: ExternalApiTargetEnum;
}
