import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from './types';

@Entity('external_api_config')
@Unique(['provider', 'target'])
export class ExternalApiConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ExternalApiProviderEnum })
  provider: ExternalApiProviderEnum;

  @Column({ type: 'enum', enum: ExternalApiTargetEnum })
  target: ExternalApiTargetEnum;

  @Column()
  baseUrl: string;

  @Column({ type: 'varchar', nullable: true })
  token: string | null;

  @Column({ default: true })
  isEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
