import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_youtube_sources')
export class YoutubeSource {
  @PrimaryColumn({ type: 'varchar', length: 300 })
  source: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 24, nullable: true })
  channelId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  channelName: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
