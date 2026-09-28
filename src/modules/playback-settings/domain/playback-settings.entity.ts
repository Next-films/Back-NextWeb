import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';

@Entity('playback_settings')
export class PlaybackSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 16, default: PlaybackProvider.VIBIX })
  provider: PlaybackProvider;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  static createDefault(): PlaybackSettings {
    const entity = new PlaybackSettings();
    entity.provider = PlaybackProvider.VIBIX;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  }

  update(provider: PlaybackProvider): void {
    this.provider = provider;
    this.updatedAt = new Date();
  }
}
