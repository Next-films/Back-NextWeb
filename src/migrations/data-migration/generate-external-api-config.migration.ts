import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';

import { LoggerService } from '@/common/utils/logger/logger.service';
import { ConfigurationType } from '@/settings/configuration';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

type SeedConfig = {
  provider: ExternalApiProviderEnum;
  target: ExternalApiTargetEnum;
  baseUrl: string;
  token?: string | null;
  isEnabled?: boolean;
};

@Injectable()
export class GenerateExternalApiConfigMigration implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(GenerateExternalApiConfigMigration.name);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Generate external api config migration: Migration is running');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await this.generate(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('Generate external api config migration: Migration is completed');
    } catch (e) {
      this.logger.error(e, this.onModuleInit.name);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private buildSeedConfigs(): SeedConfig[] {
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    const seedConfigs: SeedConfig[] = [
      {
        provider: ExternalApiProviderEnum.KINOPOISK,
        target: ExternalApiTargetEnum.BACK,
        baseUrl: apiSettings.KINOPOISK_API_URL,
        token: apiSettings.KINOPOISK_API_TOKEN,
        isEnabled: true,
      },
    ];

    const downloaderKpUrl = process.env.DOWNLOADER_KINOPOISK_API_URL;
    const downloaderKpToken = process.env.DOWNLOADER_KINOPOISK_API_TOKEN;
    if (downloaderKpUrl) {
      seedConfigs.push({
        provider: ExternalApiProviderEnum.KINOPOISK,
        target: ExternalApiTargetEnum.DOWNLOADER,
        baseUrl: downloaderKpUrl,
        token: downloaderKpToken ?? null,
        isEnabled: true,
      });
    }

    const torApiUrl = process.env.TOR_API_URL;
    if (torApiUrl) {
      seedConfigs.push({
        provider: ExternalApiProviderEnum.TOR_API,
        target: ExternalApiTargetEnum.DOWNLOADER,
        baseUrl: torApiUrl,
        token: null,
        isEnabled: true,
      });
    }

    const tmdbApiUrl = process.env.TMDB_API_URL;
    const tmdbApiToken = process.env.TMDB_API_TOKEN;
    if (tmdbApiUrl && tmdbApiToken) {
      seedConfigs.push({
        provider: ExternalApiProviderEnum.TMDB,
        target: ExternalApiTargetEnum.BACK,
        baseUrl: tmdbApiUrl,
        token: tmdbApiToken,
        isEnabled: true,
      });
    }

    const fanartApiUrl = process.env.FANART_TV_API_URL;
    const fanartApiToken = process.env.FANART_TV_API_TOKEN;
    if (fanartApiUrl && fanartApiToken) {
      seedConfigs.push({
        provider: ExternalApiProviderEnum.FANART_TV,
        target: ExternalApiTargetEnum.BACK,
        baseUrl: fanartApiUrl,
        token: fanartApiToken,
        isEnabled: true,
      });
    }

    return seedConfigs;
  }

  private async generate(queryRunner: QueryRunner): Promise<void> {
    const seedConfigs = this.buildSeedConfigs();

    for (const config of seedConfigs) {
      const exists = await queryRunner.manager.findOne(ExternalApiConfigEntity, {
        where: { provider: config.provider, target: config.target },
      });

      if (exists) {
        this.logger.warn(`External api config already exists: ${config.provider}/${config.target}`);
        continue;
      }

      const currentDate = new Date();
      await queryRunner.manager.save(ExternalApiConfigEntity, {
        provider: config.provider,
        target: config.target,
        baseUrl: config.baseUrl,
        token: config.token ?? null,
        isEnabled: config.isEnabled ?? true,
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    }
  }
}
