import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminHomeSectionsController } from '@/home-sections/api/admin-home-sections.controller';
import { PublicHomeSectionsController } from '@/home-sections/api/public-home-sections.controller';
import { HomeSectionsSettings } from '@/home-sections/domain/home-sections-settings.entity';
import { HomeSectionsSettingsRepository } from '@/home-sections/infrastructure/home-sections-settings.repository';

@Module({
  imports: [TypeOrmModule.forFeature([HomeSectionsSettings])],
  controllers: [PublicHomeSectionsController, AdminHomeSectionsController],
  providers: [HomeSectionsSettingsRepository],
  exports: [HomeSectionsSettingsRepository],
})
export class HomeSectionsModule {}
