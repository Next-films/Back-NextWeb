import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminCreateShortContentDraftInputDto } from '@/admin/api/dtos/input/admin-create-short-content-draft.input.dto';

@Injectable()
export class ShortContentClientService {
  constructor(private readonly configService: ConfigService<ConfigurationType, true>) {}

  async createDraft(input: AdminCreateShortContentDraftInputDto): Promise<unknown> {
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const serviceUrl = apiSettings.SHORT_CONTENT_SERVICE_URL?.trim();

    if (!serviceUrl) {
      throw new ServiceUnavailableException('SHORT_CONTENT_SERVICE_URL is not configured');
    }

    const response = await fetch(
      new URL('/api/shorts/draft/from-backend', this.ensureTrailingSlash(serviceUrl)),
      {
        method: 'POST',
        headers: this.buildHeaders(apiSettings.SHORT_CONTENT_SERVICE_TOKEN),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new ServiceUnavailableException(
        `short-content draft request failed: ${response.status} ${response.statusText} ${errorText}`,
      );
    }

    return response.json();
  }

  private buildHeaders(token: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (token?.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    return headers;
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
