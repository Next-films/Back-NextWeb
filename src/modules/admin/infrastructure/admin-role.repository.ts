import { In, QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { AdminRole } from '@/admin/domain/admin-role.entity';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

@Injectable()
export class AdminRoleRepository {
  constructor(
    @InjectRepository(AdminRole) private readonly adminRoleRepository: Repository<AdminRole>,
  ) {}

  async getRolesByNames(
    names: AdminRoleEnum[],
    queryRunner?: QueryRunner,
  ): Promise<AdminRole[] | null> {
    if (queryRunner) {
      const roles = await queryRunner.manager.find(this.adminRoleRepository.target, {
        where: {
          name: In(names),
        },
      });

      return roles && roles.length > 0 ? roles : null;
    }
    const roles = await this.adminRoleRepository.find({
      where: {
        name: In(names),
      },
    });

    return roles && roles.length > 0 ? roles : null;
  }
}
