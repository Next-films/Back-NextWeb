import { Banner } from '@/banner/domain/banner.entity';

export class BannerOutputDto {
  id: number;
  imageUrl: string;
  linkUrl: string | null;
  buttonImageUrl: string | null;
  buttonHoverVideoUrl: string | null;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(banner: Banner): BannerOutputDto {
    const dto = new BannerOutputDto();
    dto.id = banner.id;
    dto.imageUrl = banner.imageUrl;
    dto.linkUrl = banner.linkUrl;
    dto.buttonImageUrl = banner.buttonImageUrl;
    dto.buttonHoverVideoUrl = banner.buttonHoverVideoUrl;
    dto.openInNewTab = banner.openInNewTab;
    dto.sortOrder = banner.sortOrder;
    dto.isActive = banner.isActive;
    dto.createdAt = banner.createdAt;
    dto.updatedAt = banner.updatedAt;
    return dto;
  }
}
