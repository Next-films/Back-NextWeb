import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';

@Injectable()
export class AdminAuthSessionRepository {
  constructor(
    @InjectRepository(AdminSession)
    private readonly adminAuthSessionRepository: Repository<AdminSession>,
  ) {}

  async save(session: AdminSession): Promise<number> {
    const result = await this.adminAuthSessionRepository.save(session);
    return result.id;
  }

  async removeSessionByDeviceId(deviceId: string): Promise<void> {
    await this.adminAuthSessionRepository.delete({ deviceId });
  }

  async getSessionByDeviceId(deviceId: string): Promise<AdminSession | null> {
    return this.adminAuthSessionRepository.findOne({ where: { deviceId } });
  }
}
