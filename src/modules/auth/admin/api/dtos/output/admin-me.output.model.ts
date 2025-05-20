import { Injectable } from '@nestjs/common';
import { Admin } from '@/admin/domain/admin.entity';
import { ApiProperty } from '@nestjs/swagger';

export class AdminMeOutputModel {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;
}

@Injectable()
export class AdminMeOutputModelMapper {
  mapAdmin(admin: Admin): AdminMeOutputModel {
    return {
      id: admin.id,
      email: admin.email,
      username: admin.username,
    };
  }
}
