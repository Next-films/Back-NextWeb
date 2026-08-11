import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';
import { TmdbService } from '@/external-api/tmdb/application/tmdb.service';

@Module({
  imports: [ExternalApiConfigModule, HttpModule],
  providers: [TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
