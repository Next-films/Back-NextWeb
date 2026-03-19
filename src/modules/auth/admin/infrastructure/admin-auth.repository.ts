import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { IsNull, Not, Repository } from 'typeorm';

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

  async getAdminByTelegramId(telegramId: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { adminTelegram: { telegramId } },
      relations: { adminTelegram: true, roles: true },
    });
  }

  async getAdminByTelegramUsername(telegramUsername: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { adminTelegram: { username: telegramUsername } },
      relations: { adminTelegram: true, roles: true },
    });
  }

  async getAdminByAuthToken(token: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { telegramAuthToken: token },
      relations: { adminTelegram: true, roles: true },
    });
  }

  async getAdminByEmailOrUsername(email: string, username: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: [{ email }, { username }] });
  }

  async getAdminByEmailOrUsernameOrTgId(
    email: string,
    username: string,
    telegramId: string,
  ): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: [{ email }, { username }, { adminTelegram: { telegramId } }],
      relations: {
        adminTelegram: true,
      },
    });
  }

  async getAdminById(id: number): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { id },
      relations: { adminTelegram: true, roles: true },
    });
  }

  async deleteExpiredPasswordSetupAdmins(): Promise<void> {
    const candidates = await this.adminRepository.find({
      where: {
        isOwner: false,
        password: IsNull(),
        passwordSetupDeadlineAt: Not(IsNull()),
      },
    });

    if (candidates.length === 0) return;

    const now = new Date();
    const expiredIds = candidates
      .filter(
        admin =>
          !!admin.passwordSetupDeadlineAt &&
          admin.passwordSetupDeadlineAt.getTime() < now.getTime(),
      )
      .map(admin => admin.id);

    if (expiredIds.length === 0) return;

    await this.adminRepository.delete(expiredIds);
  }
}
