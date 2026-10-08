import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SocialPublication } from '@/admin/domain/social-publication.entity';

export enum SocialPublishingProvider {
  POSTMYPOST = 'postmypost',
}

@Entity('social_publishing_rules')
export class SocialPublishingRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({
    type: 'enum',
    enum: SocialPublishingProvider,
    enumName: 'social_publishing_provider_enum',
  })
  provider: SocialPublishingProvider;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'jsonb' })
  accountIds: number[];

  @Column({ type: 'jsonb', default: () => '\'["film","cartoon","serial"]\'::jsonb' })
  contentTypes: string[];

  @Column({ type: 'int' })
  intervalMinutes: number;

  @Column({ type: 'timestamp with time zone' })
  startAt: Date;

  @Column({ type: 'timestamp with time zone' })
  nextRunAt: Date;

  @Column({ type: 'varchar', length: 100, default: 'Europe/Moscow' })
  timezone: string;

  @Column({ type: 'text', nullable: true })
  titleTemplate: string | null;

  @Column({ type: 'text', nullable: true })
  captionTemplate: string | null;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => SocialPublication, publication => publication.rule)
  publications?: SocialPublication[];
}
