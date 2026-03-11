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

  @ApiProperty({ type: String, nullable: true })
  tgUsername: string | null;

  @ApiProperty({ isArray: true })
  roles: string[];

  @ApiProperty({ type: String, nullable: true })
  avatar: string | null;
}

@Injectable()
export class AdminMeOutputModelMapper {
  mapRole(roles: AdminRole[]): string[] {
    return roles.map(r => r.name);
  }
  mapAdmin(admin: Admin): AdminMeOutputModel {
    const adminTelegram = admin.adminTelegram;

    return {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      avatar: admin.avatarUrl,
      tgId: adminTelegram?.telegramId ?? '',
      tgUsername: adminTelegram?.username ?? null,
      roles: this.mapRole(admin.roles),
    };
  }
}
