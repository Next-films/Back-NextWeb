import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { PublicVibixCatalogController } from '@/external-api/vibix/api/public-vibix-catalog.controller';
import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';
import { VideoseedModule } from '@/external-api/videoseed/videoseed.module';

@Module({
  imports: [HttpModule, ExternalApiConfigModule, VideoseedModule],
  controllers: [PublicVibixCatalogController],
  providers: [VibixCatalogService],
  exports: [VibixCatalogService],
})
export class VibixModule {}
