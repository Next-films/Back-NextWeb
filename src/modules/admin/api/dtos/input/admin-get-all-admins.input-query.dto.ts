import { QuerySortFilterUtil } from '@/common/utils/query-filter.util';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';
import { GET_ADMINS_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
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
    minLength: GET_ADMINS_VALIDATION_RULES.USERNAME.LENGTH_MIN,
    maxLength: GET_ADMINS_VALIDATION_RULES.USERNAME.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    GET_ADMINS_VALIDATION_RULES.USERNAME.LENGTH_MIN,
    GET_ADMINS_VALIDATION_RULES.USERNAME.LENGTH_MAX,
  )
  searchUsername?: string;

  @ApiPropertyOptional({
    minLength: GET_ADMINS_VALIDATION_RULES.EMAIL.LENGTH_MIN,
    maxLength: GET_ADMINS_VALIDATION_RULES.EMAIL.LENGTH_MAX,
  })
  @IsOptional()
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(
    GET_ADMINS_VALIDATION_RULES.EMAIL.LENGTH_MIN,
    GET_ADMINS_VALIDATION_RULES.EMAIL.LENGTH_MAX,
  )
  searchEmail?: string;

  @ApiPropertyOptional({ enum: AdminRoleEnum })
  @IsOptional()
  searchRole?: AdminRoleEnum;

  @ApiPropertyOptional({ enum: GetAllAdminSortFieldEnum, default: GetAllAdminSortFieldEnum.ID })
  @IsOptional()
  sortField: GetAllAdminSortFieldEnum = GetAllAdminSortFieldEnum.ID;
}
