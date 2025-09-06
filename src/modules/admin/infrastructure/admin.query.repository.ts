import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { SortDirectionEnum } from '@/common/utils/query-filter.util';
import { GetAllAdminSortFieldEnum } from '@/admin/api/dtos/input/admin-get-all-admins.input-query.dto';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

@Injectable()
export class AdminQueryRepository {
  constructor(@InjectRepository(Admin) private readonly adminRepository: Repository<Admin>) {}

  private getAdminsCondition(
    searchUserName: string | null,
    searchEmail: string | null,
    searchRole: AdminRoleEnum | null,
  ): FindOptionsWhere<Admin> {
    const where: FindOptionsWhere<Admin> = {};

    if (searchRole) {
      where.roles = {
        name: searchRole,
      };
    }

    if (searchUserName) {
      where.username = ILike(`%${searchUserName}%`);
    }

    if (searchEmail) {
      where.email = ILike(`%${searchEmail}%`);
    }

    return where;
  }

  async getAdminsCount(
    searchUserName: string | null,
    searchEmail: string | null,
    searchRole: AdminRoleEnum | null,
  ): Promise<number> {
    const where = this.getAdminsCondition(searchUserName, searchEmail, searchRole);
    return this.adminRepository.count({ where });
  }

  async getAdminsByFilter(
    skip: number,
    take: number,
    sortField: GetAllAdminSortFieldEnum,
    sortDirection: SortDirectionEnum,
    searchUserName: string | null,
    searchEmail: string | null,
    searchRole: AdminRoleEnum | null,
  ): Promise<Admin[] | null> {
    const where = this.getAdminsCondition(searchUserName, searchEmail, searchRole);

    const order = {};

    if (sortField === GetAllAdminSortFieldEnum.ROLE) {
      order[sortField] = {
        name: sortDirection,
      };
    } else {
      order[sortField] = sortDirection;
    }

    const result = await this.adminRepository.find({
      where,
      skip,
      take,
      order,
      relations: {
        adminTelegram: true,
        roles: true,
      },
    });

    return result && result.length > 0 ? result : null;
  }
}
