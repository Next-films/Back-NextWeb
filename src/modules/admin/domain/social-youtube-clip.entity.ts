import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';

/** Explicitly approved immutable export; downloaded originals are never publishing candidates. */
@Entity('social_youtube_clips')
@Unique('UQ_social_youtube_clip_revision', ['videoId', 'revision'])
export class SocialYoutubeClip {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 11 })
  videoId: string;

  @Column({ type: 'int' })
  revision: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Retain publication identity/history after the media itself has been removed. */
  @Column({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
