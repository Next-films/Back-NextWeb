import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { QueryFilterUtil } from '@/common/utils/query-filter.util';
import { ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class GetAllExternalTokensInputQueryDto extends QueryFilterUtil {
  @ApiPropertyOptional({
    minLength: ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.SEARCH_NAME.LENGTH_MIN,
    maxLength: ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.SEARCH_NAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.SEARCH_NAME.LENGTH_MIN,
    ADMIN_EXTERNAL_AUTH_TOKEN_VALIDATION_RULES.SEARCH_NAME.LENGTH_MAX,
  )
  searchName?: string;
}
