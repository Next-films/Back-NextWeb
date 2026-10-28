import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { YoutubeListedVideo } from '../application/services/youtube-reader.service';

export type YoutubeArchiveState = {
  token: string | null;
  nextToken: string | null;
  loaded: boolean;
  pending: Array<YoutubeListedVideo & { attempts?: number }>;
};

@Entity('admin_youtube_sources')
export class YoutubeSource {
  @Column({ type: 'jsonb', nullable: true }) archiveState: YoutubeArchiveState | null;
  @Column({ type: 'boolean', default: false }) archiveComplete: boolean;
  @Column({ type: 'text', nullable: true }) archiveError: string | null;
  @Column({ type: 'timestamptz', nullable: true }) archiveCompletedAt: Date | null;
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
