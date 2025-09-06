import { QueryRunner, Repository } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminTelegram)
    private readonly adminTelegramRepository: Repository<AdminTelegram>,
  ) {}

  async save(admin: Admin, queryRunner?: QueryRunner): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.save(admin);
      return;
    }

    await this.adminRepository.save(admin);
  }

  async updateProfile(admin: Admin, currentTgId: string, queryRunner?: QueryRunner): Promise<void> {
    const { id, username, email, adminTelegram } = admin;
    const { telegramId } = adminTelegram;

    const adminUpdateData = {
      username: username,
      email: email,
    };

    const tgUpdateData = {
      telegramId,
    };

    if (queryRunner) {
      await Promise.all([
        queryRunner.manager.update(this.adminRepository.target, { id }, adminUpdateData),
        queryRunner.manager.update(
          this.adminTelegramRepository.target,
          { telegramId: currentTgId },
          tgUpdateData,
        ),
      ]);
      return;
    }

    await Promise.all([
      this.adminRepository.update({ id }, adminUpdateData),
      this.adminTelegramRepository.update({ telegramId: currentTgId }, tgUpdateData),
    ]);
  }

  async getAdminByIdWithTelegramInfo(id: number, queryRunner?: QueryRunner): Promise<Admin | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.adminRepository.target, {
        where: { id },
        relations: { adminTelegram: true },
      });
    }
    return this.adminRepository.findOne({
      where: { id },
      relations: { adminTelegram: true },
    });
  }

  async getAdminByIdWithRoleInfo(id: number, queryRunner?: QueryRunner): Promise<Admin | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.adminRepository.target, {
        where: { id },
        relations: { roles: true },
      });
    }

    return this.adminRepository.findOne({
      where: { id },
      relations: { roles: true },
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
