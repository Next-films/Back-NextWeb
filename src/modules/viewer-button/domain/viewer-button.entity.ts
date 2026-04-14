import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('viewer_buttons')
export class ViewerButton {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  imageUrl: string;

  @Column({ type: 'varchar', nullable: true })
  hoverVideoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  linkUrl: string | null;

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
    hoverVideoUrl: string | null,
    linkUrl: string | null,
    sortOrder: number,
    openInNewTab: boolean = true,
  ): ViewerButton {
    const entity = new ViewerButton();
    entity.imageUrl = imageUrl;
    entity.hoverVideoUrl = hoverVideoUrl;
    entity.linkUrl = linkUrl;
    entity.sortOrder = sortOrder;
    entity.openInNewTab = openInNewTab;
    entity.isActive = true;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  }

  update(
    imageUrl?: string,
    hoverVideoUrl?: string | null,
    linkUrl?: string | null,
    sortOrder?: number,
    openInNewTab?: boolean,
  ): void {
    if (imageUrl !== undefined) this.imageUrl = imageUrl;
    if (hoverVideoUrl !== undefined) this.hoverVideoUrl = hoverVideoUrl;
    if (linkUrl !== undefined) this.linkUrl = linkUrl;
    if (sortOrder !== undefined) this.sortOrder = sortOrder;
    if (openInNewTab !== undefined) this.openInNewTab = openInNewTab;
    this.updatedAt = new Date();
  }

  toggleActive(isActive: boolean): void {
    this.isActive = isActive;
    this.updatedAt = new Date();
  }
}
