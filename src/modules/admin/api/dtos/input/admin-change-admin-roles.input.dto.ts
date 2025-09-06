import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export class AdminChangeAdminRolesInputDto {
  @ApiProperty({ enum: AdminRoleEnum, isArray: true })
  @IsEnum(AdminRoleEnum, { each: true })
  roles: AdminRoleEnum[];
}
