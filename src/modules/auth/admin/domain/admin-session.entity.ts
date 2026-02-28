import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { Session } from '@/sessions/domain/session.entity';

@Entity()
export class AdminSession extends Session {
  @ManyToOne(() => Admin, (admin: Admin) => admin.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  admin: Admin;

  @Column({ nullable: false })
  adminId: number;

  static create(adminId: number, deviceId: string, issueAt: Date, expiredAt: Date): AdminSession {
    const session = new this();
    session.adminId = adminId;
    session.issueAt = issueAt;
    session.expiredAt = expiredAt;
    session.deviceId = deviceId;

    return session;
  }

  updateSession(deviceId: string, iat: number, exp: number): void {
    this.deviceId = deviceId;
    this.issueAt = new Date(iat * 1000);
    this.expiredAt = new Date(exp * 1000);
  }
}
