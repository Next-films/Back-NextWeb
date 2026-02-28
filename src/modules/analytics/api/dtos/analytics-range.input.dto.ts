import { IsEnum, IsOptional } from 'class-validator';

export enum AnalyticsRangeEnum {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class AnalyticsRangeInputDto {
  @IsOptional()
  @IsEnum(AnalyticsRangeEnum)
  range?: AnalyticsRangeEnum = AnalyticsRangeEnum.WEEK;
}
