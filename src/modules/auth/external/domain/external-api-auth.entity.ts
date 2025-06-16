import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';

@Entity()
export class ExternalApiAuth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column()
  name: string;

  @Column()
  token: string;

  @Column({ enum: ExternalApiTokenExpAtEnum })
  exp: ExternalApiTokenExpAtEnum;

  static create(name: string, exp: ExternalApiTokenExpAtEnum): ExternalApiAuth {
    const token = new this();
    const currentDate = new Date();

    token.createdAt = currentDate;
    token.updatedAt = currentDate;
    token.name = name;
    token.exp = exp;

    return token;
  }

  update(token: string, exp?: ExternalApiTokenExpAtEnum): void {
    this.token = token;
    this.updatedAt = new Date();

    if (exp) this.exp = exp;
  }
}
