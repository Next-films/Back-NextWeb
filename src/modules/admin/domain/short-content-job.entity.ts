import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ShortContentType {
  FILM = 'film',
  CARTOON = 'cartoon',
  SERIAL = 'serial',
}

export enum ShortContentJobStatus {
  DRAFT_REQUESTED = 'draft_requested',
  DRAFTED = 'drafted',
  APPROVED = 'approved',
  RENDER_REQUESTED = 'render_requested',
  RENDERED = 'rendered',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

@Entity('short_content_jobs')
export class ShortContentJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ShortContentType, enumName: 'short_content_type_enum' })
  contentType: ShortContentType;

  @Column({ type: 'int' })
  contentId: number;

  @Column({ type: 'varchar', nullable: true })
  contentTitle: string | null;

  @Column({
    type: 'enum',
    enum: ShortContentJobStatus,
    enumName: 'short_content_job_status_enum',
    default: ShortContentJobStatus.DRAFT_REQUESTED,
  })
  status: ShortContentJobStatus;

  @Column({ type: 'jsonb' })
  requestPayload: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  draftPayload: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  shortContentJobId: string | null;

  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date | null;

  static create(
    contentType: ShortContentType,
    contentId: number,
    requestPayload: Record<string, unknown>,
  ): ShortContentJob {
    const entity = new ShortContentJob();
    entity.contentType = contentType;
    entity.contentId = contentId;
    entity.contentTitle = null;
    entity.status = ShortContentJobStatus.DRAFT_REQUESTED;
    entity.requestPayload = requestPayload;
    entity.draftPayload = null;
    entity.shortContentJobId = null;
    entity.errorMessage = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    entity.approvedAt = null;
    return entity;
  }

  markDrafted(draftPayload: Record<string, unknown>): void {
    const draftMovie = draftPayload.movie as { title?: string } | undefined;
    const shortJobId = draftPayload.jobId as string | undefined;

    this.status = ShortContentJobStatus.DRAFTED;
    this.contentTitle = draftMovie?.title ?? this.contentTitle;
    this.draftPayload = draftPayload;
    this.shortContentJobId = shortJobId ?? null;
    this.errorMessage = null;
    this.updatedAt = new Date();
  }

  markFailed(errorMessage: string): void {
    this.status = ShortContentJobStatus.FAILED;
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }

  approve(): void {
    this.status = ShortContentJobStatus.APPROVED;
    this.approvedAt = new Date();
    this.updatedAt = new Date();
  }
}
