import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';

@Entity()
export class AdminRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => Admin, (admin: Admin) => admin.roles)
  admins: Admin[];
}
