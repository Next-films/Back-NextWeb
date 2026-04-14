import { ViewerButton } from '@/viewer-button/domain/viewer-button.entity';

export class ViewerButtonOutputDto {
  id: number;
  imageUrl: string;
  hoverVideoUrl: string | null;
  linkUrl: string | null;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ViewerButton): ViewerButtonOutputDto {
    const dto = new ViewerButtonOutputDto();
    dto.id = entity.id;
    dto.imageUrl = entity.imageUrl;
    dto.hoverVideoUrl = entity.hoverVideoUrl;
    dto.linkUrl = entity.linkUrl;
    dto.openInNewTab = entity.openInNewTab;
    dto.sortOrder = entity.sortOrder;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
