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

  /** Last known state of the short-content highlights job (title, stage, clips). */
  @Column({ type: 'jsonb', nullable: true })
  draftPayload: Record<string, unknown> | null;

  /** Id of the job inside the short-content service. */
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
    entity.status = ShortContentJobStatus.RENDER_REQUESTED;
    entity.requestPayload = requestPayload;
    entity.draftPayload = null;
    entity.shortContentJobId = null;
    entity.errorMessage = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    entity.approvedAt = null;
    return entity;
  }

  /** Handed over to the short-content service, which now cuts the clips. */
  markStarted(engineJob: Record<string, unknown>): void {
    this.syncFromEngine(engineJob);
  }

  /**
   * Copies the state of the short-content job: queued/running keep the job
   * RENDER_REQUESTED, done is RENDERED, failed is FAILED.
   */
  syncFromEngine(engineJob: Record<string, unknown>): void {
    const engineStatus = engineJob.status as string | undefined;

    this.draftPayload = engineJob;
    this.shortContentJobId = (engineJob.jobId as string | undefined) ?? this.shortContentJobId;
    this.contentTitle = (engineJob.title as string | undefined) ?? this.contentTitle;

    if (engineStatus === 'done') {
      this.status = ShortContentJobStatus.RENDERED;
      this.errorMessage = null;
    } else if (engineStatus === 'failed') {
      this.status = ShortContentJobStatus.FAILED;
      this.errorMessage = (engineJob.error as string | undefined) ?? 'short-content job failed';
    } else {
      this.status = ShortContentJobStatus.RENDER_REQUESTED;
      this.errorMessage = null;
    }

    this.updatedAt = new Date();
  }

  markFailed(errorMessage: string): void {
    this.status = ShortContentJobStatus.FAILED;
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }

  get isFinished(): boolean {
    return (
      this.status === ShortContentJobStatus.RENDERED || this.status === ShortContentJobStatus.FAILED
    );
  }
}
