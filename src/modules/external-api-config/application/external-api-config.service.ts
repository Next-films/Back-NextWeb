import { Injectable } from '@nestjs/common';
import { ExternalApiConfigQueryRepository } from '@/external-api-config/infrastructure/external-api-config.query-repository';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ExternalApiConfigRepository } from '@/external-api-config/infrastructure/external-api-config.repository';
import { ExternalApiConfigSyncItemDto } from '@/external-api-config/api/dtos/external-api-config-sync.input.dto';

type CacheEntry = {
  value: ExternalApiConfigEntity[];
  expiresAt: number;
};

@Injectable()
export class ExternalApiConfigService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 5_000;
  private readonly rrIndex = new Map<string, number>();

  constructor(
    private readonly logger: LoggerService,
    private readonly externalApiConfigQueryRepository: ExternalApiConfigQueryRepository,
    private readonly externalApiConfigRepository: ExternalApiConfigRepository,
  ) {
    this.logger.setContext(ExternalApiConfigService.name);
  }

  private getCacheKey(provider: ExternalApiProviderEnum, target: ExternalApiTargetEnum): string {
    return `${provider}:${target}`;
  }

  clearCache(): void {
    this.cache.clear();
    this.rrIndex.clear();
  }

  async getActiveConfigs(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity[]> {
    const cacheKey = this.getCacheKey(provider, target);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) return cached.value;

    const configs = await this.externalApiConfigQueryRepository.getActiveConfigsByProviderTarget(
      provider,
      target,
    );

    const exact = configs?.filter(c => c.target === target) ?? [];
    const fallback = configs?.filter(c => c.target === ExternalApiTargetEnum.ALL) ?? [];
    const result = [...exact, ...fallback];

    this.cache.set(cacheKey, { value: result, expiresAt: now + this.ttlMs });
    return result;
  }

  async getActiveConfig(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity | null> {
    const configs = await this.getActiveConfigs(provider, target);
    if (!configs.length) return null;

    const cacheKey = this.getCacheKey(provider, target);
    const index = this.rrIndex.get(cacheKey) ?? 0;
    const safeIndex = index % configs.length;
    this.rrIndex.set(cacheKey, safeIndex + 1);

    return configs[safeIndex] ?? null;
  }

  async getRotatedConfigs(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity[]> {
    const configs = await this.getActiveConfigs(provider, target);
    if (configs.length <= 1) return configs;

    const cacheKey = this.getCacheKey(provider, target);
    const index = this.rrIndex.get(cacheKey) ?? 0;
    const safeIndex = index % configs.length;
    this.rrIndex.set(cacheKey, safeIndex + 1);

    return [...configs.slice(safeIndex), ...configs.slice(0, safeIndex)];
  }

  async syncConfigs(configs: ExternalApiConfigSyncItemDto[]): Promise<void> {
    for (const config of configs) {
      await this.externalApiConfigRepository.upsertByProviderTarget(
        config.provider,
        config.target,
        {
          baseUrl: config.baseUrl,
          token: config.token ?? null,
          isEnabled: config.isEnabled ?? true,
        },
      );
    }

    this.clearCache();
  }
}
