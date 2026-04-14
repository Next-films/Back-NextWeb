import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  imageUrl: string;

  @Column({ type: 'varchar', nullable: true })
  linkUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  buttonImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  buttonHoverVideoUrl: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  openInNewTab: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  static create(
    imageUrl: string,
    linkUrl: string | null,
    sortOrder: number,
    openInNewTab: boolean = true,
    buttonImageUrl: string | null = null,
    buttonHoverVideoUrl: string | null = null,
  ): Banner {
    const banner = new Banner();
    banner.imageUrl = imageUrl;
    banner.linkUrl = linkUrl;
    banner.buttonImageUrl = buttonImageUrl;
    banner.buttonHoverVideoUrl = buttonHoverVideoUrl;
    banner.sortOrder = sortOrder;
    banner.openInNewTab = openInNewTab;
    banner.isActive = true;
    banner.createdAt = new Date();
    banner.updatedAt = new Date();
    return banner;
  }

  update(
    imageUrl?: string,
    linkUrl?: string | null,
    sortOrder?: number,
    openInNewTab?: boolean,
    buttonImageUrl?: string | null,
    buttonHoverVideoUrl?: string | null,
  ): void {
    if (imageUrl !== undefined) this.imageUrl = imageUrl;
    if (linkUrl !== undefined) this.linkUrl = linkUrl;
    if (sortOrder !== undefined) this.sortOrder = sortOrder;
    if (openInNewTab !== undefined) this.openInNewTab = openInNewTab;
    if (buttonImageUrl !== undefined) this.buttonImageUrl = buttonImageUrl;
    if (buttonHoverVideoUrl !== undefined) this.buttonHoverVideoUrl = buttonHoverVideoUrl;
    this.updatedAt = new Date();
  }

  toggleActive(isActive: boolean): void {
    this.isActive = isActive;
    this.updatedAt = new Date();
  }
}
