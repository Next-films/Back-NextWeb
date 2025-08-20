import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';

@Entity()
export class FinishedTorrentModerationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kpId: string;

  @ManyToOne(() => Admin, (admin: Admin) => admin.finishedTorrentModeration, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  admin: Admin;

  @Column()
  adminId: number;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  static create(adminId: number, kpId: string): FinishedTorrentModerationEntity {
    const instance = new this();

    instance.adminId = adminId;
    instance.kpId = kpId;
    instance.createdAt = new Date();

    return instance;
  }
}
