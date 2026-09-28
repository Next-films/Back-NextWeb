import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PLAYBACK_SETTINGS_ROUTE } from '@/common/constants/route.constants';
import { PlaybackSettingsOutputDto } from '@/playback-settings/api/dtos/playback-settings.output.dto';
import { PlaybackSettingsRepository } from '@/playback-settings/infrastructure/playback-settings.repository';

@ApiTags('Public - playback settings')
@Controller(PLAYBACK_SETTINGS_ROUTE.MAIN)
export class PublicPlaybackSettingsController {
  constructor(private readonly playbackSettingsRepository: PlaybackSettingsRepository) {}

  @Get()
  async getSettings(): Promise<PlaybackSettingsOutputDto> {
    const settings = await this.playbackSettingsRepository.getOrCreateDefault();
    return PlaybackSettingsOutputDto.fromEntity(settings);
  }
}
