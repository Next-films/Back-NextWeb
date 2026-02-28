import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { Admin } from '@/admin/domain/admin.entity';
import {
  AdminMeOutputModel,
  AdminMeOutputModelMapper,
} from '@/admin-auth/api/dtos/output/admin-me.output.model';

export class AdminGetAllAdminOutputDto extends AdminMeOutputModel {
  @ApiProperty()
  isActive: boolean;
}

@Injectable()
export class AdminGetAllAdminOutputDtoMapper extends AdminMeOutputModelMapper {
  mapEntity(admin: Admin): AdminGetAllAdminOutputDto {
    const output = this.mapAdmin(admin);

    const { isActive } = admin;
    return {
      ...output,
      isActive,
    };
  }

  mapEntities(admins: Admin[]): AdminGetAllAdminOutputDto[] {
    return admins.map(a => this.mapEntity(a));
  }
}
