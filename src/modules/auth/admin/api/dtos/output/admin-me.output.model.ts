import { Injectable } from '@nestjs/common';
import { Admin } from '@/admin/domain/admin.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '@/admin/domain/admin-role.entity';

export class AdminMeOutputModel {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  tgId: string;

  @ApiProperty({ nullable: true })
  tgUsername: string | null;

  @ApiProperty({ isArray: true })
  roles: string[];

  @ApiProperty({ nullable: true })
  avatar: string | null;
}

@Injectable()
export class AdminMeOutputModelMapper {
  mapRole(roles: AdminRole[]): string[] {
    return roles.map(r => r.name);
  }
  mapAdmin(admin: Admin): AdminMeOutputModel {
    return {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      avatar: admin.avatarUrl,
      tgId: admin.adminTelegram.telegramId,
      tgUsername: admin.adminTelegram.username,
      roles: this.mapRole(admin.roles),
    };
  }
}
