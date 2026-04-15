import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HOME_SECTIONS_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { HomeSectionsSettingsOutputDto } from '@/home-sections/api/dtos/output/home-sections-settings.output.dto';
import { HomeSectionsSettingsRepository } from '@/home-sections/infrastructure/home-sections-settings.repository';

@ApiTags('Public - home sections settings')
@Controller(HOME_SECTIONS_ROUTE.MAIN)
export class PublicHomeSectionsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly homeSectionsSettingsRepository: HomeSectionsSettingsRepository,
  ) {
    this.logger.setContext(PublicHomeSectionsController.name);
  }

  @Get()
  async getSettings(): Promise<HomeSectionsSettingsOutputDto> {
    this.logger.log('Execute: get home sections settings', this.getSettings.name);
    const settings = await this.homeSectionsSettingsRepository.getOrCreateDefault();
    return HomeSectionsSettingsOutputDto.fromEntity(settings);
  }
}
