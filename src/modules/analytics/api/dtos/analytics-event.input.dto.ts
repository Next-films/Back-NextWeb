import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  AnalyticsContentType,
  AnalyticsEventType,
} from '@/analytics/domain/analytics-event.entity';

export class AnalyticsEventInputDto {
  @IsEnum(AnalyticsEventType)
  type: AnalyticsEventType;

  @IsOptional()
  @IsEnum(AnalyticsContentType)
  contentType?: AnalyticsContentType;

  @IsOptional()
  @IsInt()
  @Min(1)
  contentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  visitorId?: string;
}
