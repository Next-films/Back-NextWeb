import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BANNER_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { BannerRepository } from '@/banner/infrastructure/banner.repository';
import { BannerOutputDto } from '@/banner/api/dtos/output/banner.output.dto';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';

@ApiTags('Public - banners')
@Controller(BANNER_ROUTE.MAIN)
export class PublicBannerController {
  constructor(
    private readonly logger: LoggerService,
    private readonly bannerRepository: BannerRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(PublicBannerController.name);
  }

  private async signUrlWithCache(
    url: string | null | undefined,
    cache: Map<string, Promise<string | null>>,
  ): Promise<string | null> {
    if (!url) return null;

    if (!cache.has(url)) {
      cache.set(
        url,
        this.downloaderServiceAdapter.signMediaUrl(url, 3600).catch(error => {
          this.logger.error(error, this.signUrlWithCache.name);
          return url;
        }),
      );
    }

    return cache.get(url)!;
  }

  @Get()
  async getActiveBanners(): Promise<BannerOutputDto[]> {
    this.logger.log('Execute: get active banners', this.getActiveBanners.name);
    const banners = await this.bannerRepository.findAllActive();
    const cache = new Map<string, Promise<string | null>>();

    return Promise.all(
      banners.map(async banner => {
        const dto = BannerOutputDto.fromEntity(banner);
        const [imageUrl, buttonImageUrl, buttonHoverVideoUrl] = await Promise.all([
          this.signUrlWithCache(dto.imageUrl, cache),
          this.signUrlWithCache(dto.buttonImageUrl, cache),
          this.signUrlWithCache(dto.buttonHoverVideoUrl, cache),
        ]);

        dto.imageUrl = imageUrl || dto.imageUrl;
        dto.buttonImageUrl = buttonImageUrl;
        dto.buttonHoverVideoUrl = buttonHoverVideoUrl;
        return dto;
      }),
    );
  }
}
