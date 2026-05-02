import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MEDIA_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

class SignPublicMediaUrlInputDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresInSec?: number;
}

@ApiTags('Public - media')
@Controller(MEDIA_ROUTE.MAIN)
export class PublicMediaController {
  private readonly allowedHosts = new Set(['request.next-films.ru', 'server.next-films.ru']);

  constructor(
    private readonly logger: LoggerService,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(PublicMediaController.name);
  }

  @Post(MEDIA_ROUTE.SIGN_URL)
  async signMediaUrl(@Body() body: SignPublicMediaUrlInputDto): Promise<{ url: string }> {
    this.logger.log('Execute: Sign public media url', this.signMediaUrl.name);

    const sourceUrl = body.url?.trim();
    if (!this.isAllowedMediaUrl(sourceUrl)) {
      throw new BadRequestException([{ field: 'url', message: 'Unsupported media url' }]);
    }

    const signed = await this.downloaderServiceAdapter.signMediaUrl(
      sourceUrl,
      body.expiresInSec ?? 3600,
    );

    if (!signed) {
      throw new BadRequestException([{ field: 'url', message: 'Failed to sign media url' }]);
    }

    return { url: signed };
  }

  private isAllowedMediaUrl(value: string | null | undefined): value is string {
    if (!value) return false;

    try {
      const parsed = new URL(value);
      const protocolAllowed = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      const hostAllowed = this.allowedHosts.has(parsed.hostname);
      const pathAllowed = parsed.pathname.startsWith('/next-films/');

      return protocolAllowed && hostAllowed && pathAllowed;
    } catch {
      return false;
    }
  }
}
