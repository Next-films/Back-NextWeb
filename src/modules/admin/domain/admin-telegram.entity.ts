import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';

// TODO: создание телеграм сущности при регистрации нового админа
@Entity()
export class AdminTelegram {
  @Column({ primary: true, unique: true })
  telegramId: string;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToOne(() => Admin, (admin: Admin) => admin.adminTelegram, { onDelete: 'CASCADE' })
  @JoinColumn()
  admin: Admin;

  @Column({ nullable: false })
  adminId: number;

  // static create(email: string, username: string, password: string): Admin {
  //   const admin = new this();
  //   admin.email = email;
  //   admin.username = username;
  //   admin.password = password;
  //   admin.createdAt = new Date();
  //
  //   return admin;
  // }
}
