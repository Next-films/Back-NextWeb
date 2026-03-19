import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BANNER_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { BannerRepository } from '@/banner/infrastructure/banner.repository';
import { BannerOutputDto } from '@/banner/api/dtos/output/banner.output.dto';

@ApiTags('Public - banners')
@Controller(BANNER_ROUTE.MAIN)
export class PublicBannerController {
  constructor(
    private readonly logger: LoggerService,
    private readonly bannerRepository: BannerRepository,
  ) {
    this.logger.setContext(PublicBannerController.name);
  }

  @Get()
  async getActiveBanners(): Promise<BannerOutputDto[]> {
    this.logger.log('Execute: get active banners', this.getActiveBanners.name);
    const banners = await this.bannerRepository.findAllActive();
    return banners.map(banner => BannerOutputDto.fromEntity(banner));
  }
}
