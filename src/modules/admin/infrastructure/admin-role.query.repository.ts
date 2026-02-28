import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { AdminRole } from '@/admin/domain/admin-role.entity';

@Injectable()
export class AdminRoleQueryRepository {
  constructor(
    @InjectRepository(AdminRole) private readonly adminRoleRepository: Repository<AdminRole>,
  ) {}

  async getRoles(): Promise<AdminRole[] | null> {
    const roles = await this.adminRoleRepository.find();

    return roles && roles.length > 0 ? roles : null;
  }
}
