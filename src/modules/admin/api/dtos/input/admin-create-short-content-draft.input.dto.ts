import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCreateShortContentDraftOptionsInputDto {
  @IsOptional()
  @IsIn(['tiktok', 'youtube_shorts'])
  platform?: 'tiktok' | 'youtube_shorts';

  @IsOptional()
  @IsNumber()
  durationSec?: number;

  @IsOptional()
  @IsIn(['hero_first_person', 'narrator', 'critic'])
  pointOfView?: 'hero_first_person' | 'narrator' | 'critic';

  @IsOptional()
  @IsString()
  narratorTone?: string;

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high'])
  spoilerLevel?: 'none' | 'low' | 'medium' | 'high';

  @IsOptional()
  @IsNumber()
  maxContinuousSourceSec?: number;

  @IsOptional()
  @IsBoolean()
  includeWatermark?: boolean;

  @IsOptional()
  @IsString()
  callToAction?: string;

  @IsOptional()
  @IsIn(['ru', 'en'])
  language?: 'ru' | 'en';
}

export class AdminCreateShortContentDraftInputDto {
  @IsIn(['film', 'cartoon', 'serial'])
  contentType: 'film' | 'cartoon' | 'serial';

  @IsInt()
  contentId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminCreateShortContentDraftOptionsInputDto)
  options?: AdminCreateShortContentDraftOptionsInputDto;
}
