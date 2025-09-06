import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { AdminRole } from '@/admin/domain/admin-role.entity';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

export class AdminRolesOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: AdminRoleEnum })
  name: AdminRoleEnum;
}

@Injectable()
export class AdminRolesOutputDtoMapper {
  mapEntity(role: AdminRole): AdminRolesOutputDto {
    const { id, name } = role;
    return {
      id,
      name: name as AdminRoleEnum,
    };
  }

  mapEntities(roles: AdminRole[]): AdminRolesOutputDto[] {
    return roles.map(r => this.mapEntity(r));
  }
}
