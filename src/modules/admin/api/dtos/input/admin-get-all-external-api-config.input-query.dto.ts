import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

export class AdminGetAllExternalApiConfigInputQueryDto extends QuerySortFilterUtil {
  @ApiPropertyOptional({ enum: ExternalApiProviderEnum })
  @IsOptional()
  @IsEnum(ExternalApiProviderEnum)
  provider?: ExternalApiProviderEnum;

  @ApiPropertyOptional({ enum: ExternalApiTargetEnum })
  @IsOptional()
  @IsEnum(ExternalApiTargetEnum)
  target?: ExternalApiTargetEnum;
}
