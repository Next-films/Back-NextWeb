import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('admin_youtube_videos')
@Index('IDX_admin_youtube_video_channel', ['channelId'])
export class YoutubeVideo {
  /** null means an old cache entry: refresh the channel before allowing a download. */
  @Column({ type: 'boolean', nullable: true })
  isShort: boolean | null;

  @PrimaryColumn({ type: 'varchar', length: 11 })
  videoId: string;

  @Column({ type: 'varchar', length: 24 })
  channelId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  likes: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  comments: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  commentsUpdatedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'timestamptz' })
  lastAttemptAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  firstSeenAt: Date;
}
