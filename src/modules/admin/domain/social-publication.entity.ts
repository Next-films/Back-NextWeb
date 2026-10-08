import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  SocialPublishingProvider,
  SocialPublishingRule,
} from '@/admin/domain/social-publishing-rule.entity';

export enum SocialPublicationStatus {
  QUEUED = 'queued',
  SUBMITTING = 'submitting',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('social_publications')
@Unique('UQ_social_publication_rule_clip', ['ruleId', 'shortContentJobId', 'clipIndex'])
export class SocialPublication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  ruleId: number;

  @ManyToOne(() => SocialPublishingRule, rule => rule.publications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule?: SocialPublishingRule;

  @Column({ type: 'int' })
  shortContentJobId: number;

  @Column({ type: 'int' })
  clipIndex: number;

  @Column({
    type: 'enum',
    enum: SocialPublishingProvider,
    enumName: 'social_publishing_provider_enum',
  })
  provider: SocialPublishingProvider;

  @Column({
    type: 'enum',
    enum: SocialPublicationStatus,
    enumName: 'social_publication_status_enum',
    default: SocialPublicationStatus.QUEUED,
  })
  status: SocialPublicationStatus;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ type: 'varchar', nullable: true })
  externalPublicationId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  providerPayload: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
