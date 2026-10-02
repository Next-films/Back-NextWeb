import { ShortContentJob } from '@/admin/domain/short-content-job.entity';

export class AdminShortContentJobOutputDto {
  id: number;
  contentType: string;
  contentId: number;
  contentTitle: string | null;
  status: string;
  shortContentJobId: string | null;
  errorMessage: string | null;
  requestPayload: Record<string, unknown>;
  /** short-content job: stage, totalClips and the clips cut so far. */
  result: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;

  static fromEntity(entity: ShortContentJob): AdminShortContentJobOutputDto {
    return {
      id: entity.id,
      contentType: entity.contentType,
      contentId: entity.contentId,
      contentTitle: entity.contentTitle,
      status: entity.status,
      shortContentJobId: entity.shortContentJobId,
      errorMessage: entity.errorMessage,
      requestPayload: entity.requestPayload,
      result: entity.draftPayload,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      approvedAt: entity.approvedAt,
    };
  }

  static fromEntities(entities: ShortContentJob[]): AdminShortContentJobOutputDto[] {
    return entities.map(entity => this.fromEntity(entity));
  }
}
