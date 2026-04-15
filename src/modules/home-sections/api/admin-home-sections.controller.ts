import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ADMIN_HOME_SECTIONS_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { HomeSectionsSettingsOutputDto } from '@/home-sections/api/dtos/output/home-sections-settings.output.dto';
import { HomeSectionsSettingsRepository } from '@/home-sections/infrastructure/home-sections-settings.repository';

@ApiTags('Admin - home sections settings')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(ADMIN_HOME_SECTIONS_ROUTE.MAIN)
export class AdminHomeSectionsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly homeSectionsSettingsRepository: HomeSectionsSettingsRepository,
  ) {
    this.logger.setContext(AdminHomeSectionsController.name);
  }

  private normalizeOptionalBoolean(value: unknown): boolean | undefined {
    if (value === true || value === false) {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return undefined;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    }

    return undefined;
  }

  @Get()
  async getSettings(): Promise<HomeSectionsSettingsOutputDto> {
    this.logger.log('Execute: get home sections settings for admin', this.getSettings.name);
    const settings = await this.homeSectionsSettingsRepository.getOrCreateDefault();
    return HomeSectionsSettingsOutputDto.fromEntity(settings);
  }

  @HttpCode(HttpStatus.OK)
  @Put()
  async updateSettings(
    @Body() body: Record<string, unknown>,
  ): Promise<HomeSectionsSettingsOutputDto> {
    this.logger.log('Execute: update home sections settings for admin', this.updateSettings.name);
    const settings = await this.homeSectionsSettingsRepository.getOrCreateDefault();
    settings.update(
      this.normalizeOptionalBoolean(body.showFilms),
      this.normalizeOptionalBoolean(body.showSerials),
      this.normalizeOptionalBoolean(body.showCartoons),
    );
    const saved = await this.homeSectionsSettingsRepository.save(settings);
    return HomeSectionsSettingsOutputDto.fromEntity(saved);
  }
}
