import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { PublicVideoseedCatalogController } from '@/external-api/videoseed/api/public-videoseed-catalog.controller';
import { VideoseedCatalogService } from '@/external-api/videoseed/application/videoseed-catalog.service';
import { VideoseedService } from '@/external-api/videoseed/application/videoseed.service';

@Module({
  imports: [HttpModule, ExternalApiConfigModule],
  controllers: [PublicVideoseedCatalogController],
  providers: [VideoseedService, VideoseedCatalogService],
  exports: [VideoseedService],
})
export class VideoseedModule {}
