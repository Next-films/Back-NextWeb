import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiConfigRepository } from '@/external-api-config/infrastructure/external-api-config.repository';
import { ExternalApiConfigQueryRepository } from '@/external-api-config/infrastructure/external-api-config.query-repository';
import { ExternalApiConfigService } from '@/external-api-config/application/external-api-config.service';
import { ExternalApiConfigController } from '@/external-api-config/api/external-api-config.controller';
import { ExternalApiConfigOutputDtoMapper } from '@/external-api-config/api/dtos/external-api-config.output.dto';
import { GenerateExternalApiConfigMigration } from '@/data-migrations/generate-external-api-config.migration';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalApiConfigEntity])],
  controllers: [ExternalApiConfigController],
  providers: [
    ExternalApiConfigRepository,
    ExternalApiConfigQueryRepository,
    ExternalApiConfigService,
    ExternalApiConfigOutputDtoMapper,
    GenerateExternalApiConfigMigration,
  ],
  exports: [
    ExternalApiConfigRepository,
    ExternalApiConfigQueryRepository,
    ExternalApiConfigService,
  ],
})
export class ExternalApiConfigModule {}
