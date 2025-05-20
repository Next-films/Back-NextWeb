import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminAuthRepository {
  constructor(@InjectRepository(Admin) private readonly adminRepository: Repository<Admin>) {}

  async save(admin: Admin): Promise<number> {
    const newAdmin = await this.adminRepository.save(admin);

    return newAdmin.id;
  }

  async isExistAdmin(id: number): Promise<boolean> {
    const admin = await this.adminRepository.findOne({ where: { id }, select: { id: true } });

    return !!admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { email } });
  }

  async getAdminByEmailOrUsername(email: string, username: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: [{ email }, { username }] });
  }

  async getAdminById(id: number): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { id } });
  }
}
