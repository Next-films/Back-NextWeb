import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ADMIN_PLAYBACK_SETTINGS_ROUTE } from '@/common/constants/route.constants';
import { PlaybackSettingsOutputDto } from '@/playback-settings/api/dtos/playback-settings.output.dto';
import { UpdatePlaybackSettingsInputDto } from '@/playback-settings/api/dtos/update-playback-settings.input.dto';
import { PlaybackSettingsRepository } from '@/playback-settings/infrastructure/playback-settings.repository';

@ApiTags('Admin - playback settings')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(ADMIN_PLAYBACK_SETTINGS_ROUTE.MAIN)
export class AdminPlaybackSettingsController {
  constructor(private readonly playbackSettingsRepository: PlaybackSettingsRepository) {}

  @Get()
  async getSettings(): Promise<PlaybackSettingsOutputDto> {
    const settings = await this.playbackSettingsRepository.getOrCreateDefault();
    return PlaybackSettingsOutputDto.fromEntity(settings);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Body() input: UpdatePlaybackSettingsInputDto,
  ): Promise<PlaybackSettingsOutputDto> {
    const settings = await this.playbackSettingsRepository.getOrCreateDefault();
    settings.update(input.provider);
    return PlaybackSettingsOutputDto.fromEntity(
      await this.playbackSettingsRepository.save(settings),
    );
  }
}
