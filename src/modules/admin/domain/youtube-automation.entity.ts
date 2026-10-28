import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_youtube_automation')
export class YoutubeAutomation {
  @PrimaryColumn({ type: 'integer' }) id: number;
  @Column({ type: 'boolean', default: false }) enabled: boolean;
  @Column({ type: 'boolean', default: true }) includeArchive: boolean;
  @Column({ type: 'text', nullable: true }) lastError: string | null;
  @Column({ type: 'timestamptz', nullable: true }) lastRunAt: Date | null;
  @UpdateDateColumn() updatedAt: Date;
}
