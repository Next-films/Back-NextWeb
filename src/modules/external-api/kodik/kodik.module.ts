import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { PublicKodikCatalogController } from '@/external-api/kodik/api/public-kodik-catalog.controller';
import { KodikCatalogService } from '@/external-api/kodik/application/kodik-catalog.service';

@Module({
  imports: [HttpModule, ExternalApiConfigModule],
  controllers: [PublicKodikCatalogController],
  providers: [KodikCatalogService],
  exports: [KodikCatalogService],
})
export class KodikModule {}
