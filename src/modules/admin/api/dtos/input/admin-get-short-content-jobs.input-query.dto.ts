import { IsIn, IsOptional } from 'class-validator';
import { ShortContentJobStatus, ShortContentType } from '@/admin/domain/short-content-job.entity';

export class AdminGetShortContentJobsInputQueryDto {
  @IsOptional()
  @IsIn(Object.values(ShortContentType))
  contentType?: ShortContentType;

  @IsOptional()
  @IsIn(Object.values(ShortContentJobStatus))
  status?: ShortContentJobStatus;
}
