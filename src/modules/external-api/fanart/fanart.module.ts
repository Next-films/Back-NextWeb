import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { FanartService } from '@/external-api/fanart/application/fanart.service';
import { ExternalApiConfigModule } from '@/external-api-config/external-api-config.module';

@Module({
  imports: [ExternalApiConfigModule, HttpModule],
  providers: [FanartService],
  exports: [FanartService],
})
export class FanartModule {}
