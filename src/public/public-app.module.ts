import { ConsoleLogger, Controller, Get, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { PublicVibixCatalogController } from '@/external-api/vibix/api/public-vibix-catalog.controller';
import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';
import { PublicVideoseedCatalogController } from '@/external-api/videoseed/api/public-videoseed-catalog.controller';
import { VideoseedCatalogService } from '@/external-api/videoseed/application/videoseed-catalog.service';
import { VideoseedService } from '@/external-api/videoseed/application/videoseed.service';
import { PublicKodikCatalogController } from '@/external-api/kodik/api/public-kodik-catalog.controller';
import { KodikCatalogService } from '@/external-api/kodik/application/kodik-catalog.service';
import { ExternalBannerService } from '@/banner/application/external-banner.service';
import { PlaybackSettingsRepository } from '@/playback-settings/infrastructure/playback-settings.repository';
import { PlaybackProvider } from '@/playback-settings/domain/playback-provider.enum';
import { PublicConfigService } from './public-config.service';

@Controller()
export class PublicRuntimeController {
  constructor(private readonly banners: ExternalBannerService) {}

  @Get('health')
  health() {
    return { ok: true, role: 'public', internalConnections: false };
  }

  @Get('playback-settings')
  playback() {
    return { provider: PlaybackProvider.VIBIX };
  }

  // The frontend adds verified external banners client-side. Never expose internal/manual assets.
  @Get('banners')
  manualBanners() {
    return [];
  }

  @Get('banners/external')
  externalBanners() {
    return this.banners.getCandidates();
  }

  @Get('home-sections')
  homeSections() {
    return { showFilms: true, showSerials: true, showCartoons: true };
  }

  @Get('viewer-buttons')
  viewerButtons() {
    return [];
  }
}

/** Deliberately no CommonModule, TypeORM, AdminModule, ScheduleModule, RMQ or Telegram. */
@Module({
  imports: [HttpModule],
  controllers: [
    PublicRuntimeController,
    PublicVibixCatalogController,
    PublicVideoseedCatalogController,
    PublicKodikCatalogController,
  ],
  providers: [
    { provide: LoggerService, useFactory: () => new ConsoleLogger('PublicCatalogue') },
    { provide: ExternalApiConfigService, useFactory: () => new PublicConfigService() },
    {
      provide: PlaybackSettingsRepository,
      useValue: { getOrCreateDefault: () => Promise.resolve({ provider: PlaybackProvider.VIBIX }) },
    },
    VibixCatalogService,
    VideoseedService,
    VideoseedCatalogService,
    KodikCatalogService,
    ExternalBannerService,
  ],
})
export class PublicAppModule {}
