import { HomeSectionsSettings } from '@/home-sections/domain/home-sections-settings.entity';

export class HomeSectionsSettingsOutputDto {
  showFilms: boolean;
  showSerials: boolean;
  showCartoons: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: HomeSectionsSettings): HomeSectionsSettingsOutputDto {
    const dto = new HomeSectionsSettingsOutputDto();
    dto.showFilms = entity.showFilms;
    dto.showSerials = entity.showSerials;
    dto.showCartoons = entity.showCartoons;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
