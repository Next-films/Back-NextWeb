import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaybackSettings } from '@/playback-settings/domain/playback-settings.entity';

@Injectable()
export class PlaybackSettingsRepository {
  constructor(
    @InjectRepository(PlaybackSettings)
    private readonly repository: Repository<PlaybackSettings>,
  ) {}

  async getOrCreateDefault(): Promise<PlaybackSettings> {
    const [settings] = await this.repository.find({
      order: { id: 'ASC' },
      take: 1,
    });

    return settings ?? this.repository.save(PlaybackSettings.createDefault());
  }

  save(settings: PlaybackSettings): Promise<PlaybackSettings> {
    return this.repository.save(settings);
  }
}
