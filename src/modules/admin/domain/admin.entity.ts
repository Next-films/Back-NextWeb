import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => AdminSession, (adminSession: AdminSession) => adminSession.admin)
  sessions: AdminSession[];

  static create(email: string, username: string, password: string): Admin {
    const admin = new this();
    admin.email = email;
    admin.username = username;
    admin.password = password;
    admin.createdAt = new Date();

    return admin;
  }
}
