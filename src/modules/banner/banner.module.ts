import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from '@/banner/domain/banner.entity';
import { BannerRepository } from '@/banner/infrastructure/banner.repository';
import { PublicBannerController } from '@/banner/api/public-banner.controller';
import { AdminBannerController } from '@/banner/api/admin-banner.controller';
import { MoviesModules } from '@/movies/movies.modules';
import { ExternalBannerService } from '@/banner/application/external-banner.service';
import { VibixModule } from '@/external-api/vibix/vibix.module';
import { VideoseedModule } from '@/external-api/videoseed/videoseed.module';
import { KodikModule } from '@/external-api/kodik/kodik.module';
import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { PlaybackSettingsModule } from '@/playback-settings/playback-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    MoviesModules,
    VibixModule,
    VideoseedModule,
    KodikModule,
    ExternalApiConfigModule,
    PlaybackSettingsModule,
  ],
  controllers: [PublicBannerController, AdminBannerController],
  providers: [BannerRepository, ExternalBannerService],
  exports: [BannerRepository],
})
export class BannerModule {}
