import { IsEnum } from 'class-validator';
import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';

export class UpdatePlaybackSettingsInputDto {
  @IsEnum(PlaybackProvider)
  provider: PlaybackProvider;
}
