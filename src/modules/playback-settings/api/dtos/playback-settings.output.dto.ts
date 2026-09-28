import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';
import { PlaybackSettings } from '@/playback-settings/domain/playback-settings.entity';

export class PlaybackSettingsOutputDto {
  provider: PlaybackProvider;
  updatedAt: Date;

  static fromEntity(entity: PlaybackSettings): PlaybackSettingsOutputDto {
    const dto = new PlaybackSettingsOutputDto();
    dto.provider = entity.provider;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
