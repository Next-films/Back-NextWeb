import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';
import { ADMIN_AUTH_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export enum GetAllAdminSortFieldEnum {
  ID = 'id',
  EMAIL = 'email',
  USERNAME = 'username',
  ROLE = 'roles',
}
export class GetAllAdminInputQueryDto extends QuerySortFilterUtil {
  @ApiPropertyOptional({
    minLength: ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.USERNAME.LENGTH_MAX,
  )
  searchUsername?: string;

  @ApiPropertyOptional({
    minLength: ADMIN_AUTH_VALIDATION_RULES.EMAIL.LENGTH_MIN,
    maxLength: ADMIN_AUTH_VALIDATION_RULES.EMAIL.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    ADMIN_AUTH_VALIDATION_RULES.EMAIL.LENGTH_MIN,
    ADMIN_AUTH_VALIDATION_RULES.EMAIL.LENGTH_MAX,
  )
  searchEmail?: string;

  @ApiPropertyOptional({ enum: AdminRoleEnum })
  @IsOptional()
  searchRole?: AdminRoleEnum;

  @ApiPropertyOptional({ enum: GetAllAdminSortFieldEnum, default: GetAllAdminSortFieldEnum.ID })
  @IsOptional()
  sortField: GetAllAdminSortFieldEnum = GetAllAdminSortFieldEnum.ID;
}
