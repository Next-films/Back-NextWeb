import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPlaybackSettingsController } from '@/playback-settings/api/admin-playback-settings.controller';
import { PublicPlaybackSettingsController } from '@/playback-settings/api/public-playback-settings.controller';
import { PlaybackSettings } from '@/playback-settings/domain/playback-settings.entity';
import { PlaybackSettingsRepository } from '@/playback-settings/infrastructure/playback-settings.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PlaybackSettings])],
  controllers: [AdminPlaybackSettingsController, PublicPlaybackSettingsController],
  providers: [PlaybackSettingsRepository],
  exports: [PlaybackSettingsRepository],
})
export class PlaybackSettingsModule {}
