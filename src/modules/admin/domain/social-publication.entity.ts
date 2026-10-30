import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  SocialPublishingProvider,
  SocialPublishingRule,
} from '@/admin/domain/social-publishing-rule.entity';
import { SocialYoutubeClip } from './social-youtube-clip.entity';

export enum SocialPublicationStatus {
  QUEUED = 'queued',
  SUBMITTING = 'submitting',
  PROCESSING = 'processing',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('social_publications')
@Unique('UQ_social_publication_rule_clip', ['ruleId', 'shortContentJobId', 'clipIndex'])
@Index('UQ_social_publication_rule_youtube', ['ruleId', 'youtubeAssetId'], { unique: true })
export class SocialPublication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  ruleId: number;

  @ManyToOne(() => SocialPublishingRule, rule => rule.publications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule?: SocialPublishingRule;

  @Column({ type: 'varchar', length: 10, default: 'own' })
  sourceGroup: 'own' | 'youtube';

  @Column({ type: 'varchar', length: 64, nullable: true })
  youtubeAssetId: string | null;

  @ManyToOne(() => SocialYoutubeClip, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'youtubeAssetId' })
  youtubeClip?: SocialYoutubeClip | null;

  @Column({ type: 'int', nullable: true })
  shortContentJobId: number | null;

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

  @Column({ type: 'varchar', nullable: true })
  externalUploadId: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalFileId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  providerPayload: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** When the locally rendered clip was removed after every required publication succeeded. */
  @Column({ type: 'timestamp with time zone', nullable: true })
  clipDeletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
