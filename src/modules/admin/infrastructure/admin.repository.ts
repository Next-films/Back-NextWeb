import { QueryRunner, Repository } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminRepository {
  constructor(@InjectRepository(Admin) private readonly adminRepository: Repository<Admin>) {}

  async save(admin: Admin): Promise<void> {
    await this.adminRepository.save(admin);
  }

  async getAdminByIdWithTelegramInfo(id: number): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { id },
      relations: { adminTelegram: true },
    });
  }

  async getAdminById(id: number, queryRunner?: QueryRunner): Promise<Admin | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.adminRepository.target, { where: { id: id } });
    }
    return this.adminRepository.findOne({
      where: { id },
    });
  }

  async getAdminByTelegramId(telegramId: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { adminTelegram: { telegramId } },
      relations: { adminTelegram: true },
    });
  }
}
