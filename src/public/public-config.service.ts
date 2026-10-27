import { Injectable } from '@nestjs/common';
import { ExternalApiConfigEntity } from '@/external-api-config/domain/external-api-config.entity';
import { ExternalApiProviderEnum, ExternalApiTargetEnum } from '@/external-api-config/domain/types';

const providers = [
  ExternalApiProviderEnum.VIBIX,
  ExternalApiProviderEnum.VIDEOSEED,
  ExternalApiProviderEnum.KODIK,
];

/** Read-only ENV configuration. No database, config-sync endpoint, or internal fallback. */
@Injectable()
export class PublicConfigService {
  constructor(private readonly environment: NodeJS.ProcessEnv = process.env) {}

  getActiveConfigs(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity[]> {
    if (!providers.includes(provider) || target !== ExternalApiTargetEnum.BACK)
      return Promise.resolve([]);
    const prefix = `PUBLIC_${provider.toUpperCase()}`;
    const baseUrl = this.environment[`${prefix}_API_URL`]?.trim();
    const token = this.environment[`${prefix}_API_TOKEN`]?.trim();
    if (!baseUrl || !token || this.environment[`${prefix}_ENABLED`] === 'false')
      return Promise.resolve([]);
    const config = new ExternalApiConfigEntity();
    Object.assign(config, { provider, target, baseUrl, token, isEnabled: true });
    return Promise.resolve([config]);
  }

  async getActiveConfig(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity | null> {
    return (await this.getActiveConfigs(provider, target))[0] ?? null;
  }

  getRotatedConfigs(
    provider: ExternalApiProviderEnum,
    target: ExternalApiTargetEnum,
  ): Promise<ExternalApiConfigEntity[]> {
    return this.getActiveConfigs(provider, target);
  }
}

export function validatePublicEnvironment(env: NodeJS.ProcessEnv): void {
  if (env.APP_ROLE !== 'public') throw new Error('Public runtime requires APP_ROLE=public');
  if (!env.PUBLIC_VIBIX_API_TOKEN?.trim() || !env.PUBLIC_VIBIX_API_URL?.trim()) {
    throw new Error('Public catalogue requires PUBLIC_VIBIX_API_URL and PUBLIC_VIBIX_API_TOKEN');
  }
  // Reject accidentally reused monolith ENV rather than silently ignoring internal credentials.
  for (const key of [
    'POSTGRES_URL',
    'POSTGRES_HOST',
    'RMQ_URI',
    'DOWNLOAD_SERVICE_HTTP_URL',
    'SHORT_CONTENT_SERVICE_URL',
    'TELEGRAM_GATEWAY_URL',
  ]) {
    if (env[key]?.trim())
      throw new Error(`${key} must not be configured in the isolated public runtime`);
  }
  if (env.IS_RMQ_ENABLE === 'true') throw new Error('RMQ is prohibited in the public runtime');
  for (const provider of providers) {
    const value = env[`PUBLIC_${provider.toUpperCase()}_API_URL`];
    if (!value) continue;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      throw new Error(`PUBLIC_${provider.toUpperCase()}_API_URL must be an HTTPS provider URL`);
    }
    const allowedHosts: Record<string, string[]> = {
      vibix: ['vibix.org', 'vibix.me', 'api.vibix.org'],
      videoseed: ['api.videoseed.tv', 'videoseed.tv'],
      kodik: ['kodikapi.com', 'kodik-api.com'],
    };
    if (!allowedHosts[provider].includes(url.hostname)) {
      throw new Error(
        `Unexpected API host for ${provider}; explicitly extend the public allowlist first`,
      );
    }
  }
}
